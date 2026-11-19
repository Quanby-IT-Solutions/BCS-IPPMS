import { Injectable } from "@nestjs/common"
import { randomBytes, randomUUID, scryptSync } from "node:crypto"
import { ORPCError } from "@orpc/server"
import { eq, inArray, sql } from "drizzle-orm"

import { generateCompliantPassword, validatePassword } from "@repo/auth/password-policy"
import {
	ADMIN_ROLE,
	getPermissionMeta,
	PERMISSION_NAMES,
	type AssignRoleRequest,
	type AssignUserDivisionRequest,
	type AssignUserDivisionResponse,
	type CreateRoleInput,
	type CreateUserInput,
	type PermissionCatalogEntry,
	type PermissionName,
	type RemoveRoleRequest,
	type Role,
	type SetRolePermissionsRequest,
	type SetUserActiveRequest,
	type UpdateRoleRequest,
	type UpdateUserRequest,
	type UserWithRoles,
} from "@repo/contracts"
import {
	accounts,
	divisions,
	permissions,
	rolePermissions,
	roles,
	userRoles,
	users,
} from "@repo/db/schema"

import { AUDIT_DOMAIN_RBAC, AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"
import { RbacCacheService } from "@/common/rbac/rbac-cache.service"
import { RbacService } from "@/common/rbac/rbac.service"

const PERMISSION_CATALOG = new Set<string>(PERMISSION_NAMES)

/**
 * Owning module label recorded on RBAC audit events. Aliased to the shared
 * constant so the two spellings in this file cannot drift apart.
 */
const AUDIT_MODULE = AUDIT_DOMAIN_RBAC

@Injectable()
export class RbacAdminService {
	constructor(
		private readonly rbacService: RbacService,
		private readonly cacheService: RbacCacheService,
		private readonly auditService: AuditService
	) {}

	// ---------------------------------------------------------------- roles
	async listRoles(): Promise<Role[]> {
		const roleRows = await db.select().from(roles).orderBy(roles.name)

		const permRows = await db
			.select({ roleId: rolePermissions.roleId, name: permissions.name })
			.from(rolePermissions)
			.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))

		const countRows = await db
			.select({ roleId: userRoles.roleId, count: sql<number>`count(*)::int` })
			.from(userRoles)
			.groupBy(userRoles.roleId)

		const permsByRole = new Map<number, PermissionName[]>()
		for (const row of permRows) {
			if (!PERMISSION_CATALOG.has(row.name)) continue
			const list = permsByRole.get(row.roleId) ?? []
			list.push(row.name as PermissionName)
			permsByRole.set(row.roleId, list)
		}

		const countByRole = new Map<number, number>()
		for (const row of countRows) {
			countByRole.set(row.roleId, row.count)
		}

		return roleRows.map(role => ({
			id: role.id,
			name: role.name,
			description: role.description,
			permissions: this.orderPermissions(permsByRole.get(role.id) ?? []),
			userCount: countByRole.get(role.id) ?? 0,
			createdAt: role.createdAt,
			updatedAt: role.updatedAt,
		}))
	}

	async createRole(payload: CreateRoleInput, actorId: string | null = null): Promise<Role> {
		// The role row and its audit entry share one transaction, so a role can
		// never appear without a record of who created it. The uniqueness check
		// is inside the transaction too: checking outside it would race another
		// request creating the same name.
		const roleId = await db.transaction(async tx => {
			const [existing] = await tx.select().from(roles).where(eq(roles.name, payload.name))
			if (existing) {
				throw new ORPCError("CONFLICT", { message: `Role "${payload.name}" already exists` })
			}

			const [role] = await tx
				.insert(roles)
				.values({ name: payload.name, description: payload.description ?? null })
				.returning()

			if (!role) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Role could not be created" })
			}

			await this.auditService.record(
				{
					domain: AUDIT_DOMAIN_RBAC,
					action: "role.create",
					actorId,
					targetType: "role",
					targetId: String(role.id),
					oldValue: null,
					newValue: { name: role.name, description: role.description },
				},
				tx
			)

			return role.id
		})

		// Optional initial permission set from the catalog. Applied after the
		// role exists, and audited separately for the same reason as updateRole.
		if (payload.permissions !== undefined) {
			await this.replaceRolePermissions(roleId, payload.permissions)
			// New role grants nobody until assigned, but keep cache consistent.
			await this.cacheService.clear()

			await this.auditService.record({
				actorId,
				action: "role.permissions_set",
				module: AUDIT_MODULE,
				entityType: "role",
				entityId: roleId,
				newValue: { permissions: Array.from(new Set(payload.permissions)).sort() },
				metadata: { name: payload.name, via: "role.create" },
			})
		}

		return this.buildRole(roleId)
	}

	async updateRole(payload: UpdateRoleRequest, actorId: string | null = null): Promise<Role> {
		const role = await this.getRoleRowOrThrow(payload.id)

		if (role.name === ADMIN_ROLE && payload.name !== undefined && payload.name !== ADMIN_ROLE) {
			// A denial is evidence: record the refused attempt, then reject.
			await this.auditService.record({
				domain: AUDIT_DOMAIN_RBAC,
				action: "role.update",
				outcome: "denied",
				actorId,
				targetType: "role",
				targetId: String(role.id),
				oldValue: { name: role.name },
				newValue: { name: payload.name },
				reason: "The Admin role cannot be renamed",
			})
			throw new ORPCError("FORBIDDEN", { message: "The Admin role cannot be renamed" })
		}

		await db.transaction(async tx => {
			if (payload.name !== undefined && payload.name !== role.name) {
				const [clash] = await tx.select().from(roles).where(eq(roles.name, payload.name))
				if (clash) {
					throw new ORPCError("CONFLICT", { message: `Role "${payload.name}" already exists` })
				}
			}

			const next = {
				name: payload.name ?? role.name,
				description: payload.description !== undefined ? payload.description : role.description,
			}

			await tx
				.update(roles)
				.set({ ...next, updatedAt: new Date() })
				.where(eq(roles.id, role.id))

			await this.auditService.record(
				{
					domain: AUDIT_DOMAIN_RBAC,
					action: "role.update",
					actorId,
					targetType: "role",
					targetId: String(role.id),
					oldValue: { name: role.name, description: role.description },
					newValue: next,
				},
				tx
			)
		})

		// Optional wholesale permission replacement (same semantics as
		// setRolePermissions). Audited as its own event rather than folded into
		// the role.update entry above: it changes what every holder of the role
		// can do, which is a distinct fact from renaming the role.
		if (payload.permissions !== undefined) {
			await this.replaceRolePermissions(role.id, payload.permissions)
			await this.cacheService.clear()

			await this.auditService.record({
				actorId,
				action: "role.permissions_set",
				module: AUDIT_MODULE,
				entityType: "role",
				entityId: role.id,
				newValue: { permissions: Array.from(new Set(payload.permissions)).sort() },
				metadata: { name: payload.name ?? role.name, via: "role.update" },
			})
		}

		return this.buildRole(role.id)
	}

	async setRolePermissions(
		payload: SetRolePermissionsRequest,
		actorId: string | null = null
	): Promise<Role> {
		const role = await this.getRoleRowOrThrow(payload.id)

		await this.replaceRolePermissions(role.id, payload.permissions)

		await this.cacheService.clear()

		await this.auditService.record({
			actorId,
			action: "role.permissions_set",
			module: AUDIT_MODULE,
			entityType: "role",
			entityId: role.id,
			metadata: { name: role.name, permissions: Array.from(new Set(payload.permissions)) },
		})

		return this.buildRole(role.id)
	}

	async deleteRole(
		id: number,
		actorId: string | null = null
	): Promise<{ success: boolean; id: number }> {
		const role = await this.getRoleRowOrThrow(id)

		if (role.name === ADMIN_ROLE) {
			await this.auditService.record({
				domain: AUDIT_DOMAIN_RBAC,
				action: "role.delete",
				outcome: "denied",
				actorId,
				targetType: "role",
				targetId: String(role.id),
				oldValue: { name: role.name },
				reason: "The Admin role cannot be deleted",
			})
			throw new ORPCError("FORBIDDEN", { message: "The Admin role cannot be deleted" })
		}

		await db.delete(roles).where(eq(roles.id, role.id))
		await this.cacheService.clear()

		await this.auditService.record({
			actorId,
			action: "role.deleted",
			module: AUDIT_MODULE,
			entityType: "role",
			entityId: role.id,
			metadata: { name: role.name },
		})

		return { success: true, id: role.id }
	}

	// ---------------------------------------------------------- permissions
	async listPermissions(): Promise<PermissionCatalogEntry[]> {
		const rows = await db.select().from(permissions)
		const descByName = new Map(rows.map(row => [row.name, row.description]))

		// Overlay the static hierarchy metadata (module/subModule/resource/action)
		// so the T9 permission matrix can render without re-parsing names.
		return PERMISSION_NAMES.filter(name => descByName.has(name)).map(name => {
			const meta = getPermissionMeta(name)
			return {
				name,
				description: descByName.get(name) ?? meta?.description ?? null,
				module: meta?.module ?? null,
				subModule: meta?.subModule ?? null,
				resource: meta?.resource ?? null,
				action: meta?.action ?? null,
				isWildcard: meta?.isWildcard ?? name.endsWith(":*"),
			}
		})
	}

	// ---------------------------------------------------------------- users
	/**
	 * List users.
	 *
	 * `includeDirectory` decides whether email addresses are returned. Holding
	 * `users:read` used to yield the complete email directory, so granting
	 * someone support-ticket triage (also on `users:read`) handed them every
	 * address as a side effect.
	 *
	 * The design call: the endpoint OMITS the emails rather than returning 403.
	 * A 403 would break the user-management screen entirely for triage staff
	 * who legitimately need to see who exists and what roles they hold; the
	 * useful part of the list survives without the PII.
	 */
	async listUsers(includeDirectory: boolean): Promise<UserWithRoles[]> {
		const userRows = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				isActive: users.isActive,
				divisionId: users.divisionId,
				divisionName: divisions.name,
			})
			.from(users)
			.leftJoin(divisions, eq(users.divisionId, divisions.id))
			.orderBy(users.email)

		const roleRows = await db
			.select({ userId: userRoles.userId, name: roles.name })
			.from(userRoles)
			.innerJoin(roles, eq(userRoles.roleId, roles.id))

		const rolesByUser = new Map<string, string[]>()
		for (const row of roleRows) {
			const list = rolesByUser.get(row.userId) ?? []
			list.push(row.name)
			rolesByUser.set(row.userId, list)
		}

		return userRows.map(user => ({
			id: user.id,
			name: user.name,
			// Empty string, not the address, when the caller lacks the directory
			// permission. The field stays present so the contract is unchanged
			// and clients need no conditional handling.
			email: includeDirectory ? user.email : "",
			roles: (rolesByUser.get(user.id) ?? []).sort(),
			isActive: user.isActive,
			divisionId: user.divisionId ?? null,
			divisionName: user.divisionName ?? null,
		}))
	}

	/**
	 * Create a user with a Better Auth compatible credential account.
	 *
	 * Credential mechanism: rather than calling the Better Auth server sign-up API
	 * (which would also mint a session for the new user as a side effect), we
	 * insert the `users` row plus a `credential` `accounts` row whose password is
	 * hashed with Better Auth's default scrypt `salt:hash` format — identical to
	 * the seed's {@link hashPassword}. Sign-in via email/password therefore works
	 * immediately. When no password is supplied, a random temporary credential is
	 * generated (invite-style); its plaintext is never returned or logged, so
	 * delivery/reset is handled out-of-band (notifications / T9).
	 */
	async createUser(
		payload: CreateUserInput,
		actorId: string | null = null
	): Promise<UserWithRoles> {
		const email = payload.email.trim().toLowerCase()

		const [existing] = await db.select().from(users).where(eq(users.email, email))
		if (existing) {
			throw new ORPCError("CONFLICT", { message: `A user with email "${email}" already exists` })
		}

		// Validate the division up-front so we fail before writing any rows.
		if (payload.divisionId !== undefined && payload.divisionId !== null) {
			const [division] = await db
				.select()
				.from(divisions)
				.where(eq(divisions.id, payload.divisionId))
			if (!division) {
				throw new ORPCError("NOT_FOUND", {
					message: `Division with ID ${payload.divisionId} not found`,
				})
			}
		}

		// Validate role names up-front (must exist in the roles table).
		const roleNames = Array.from(new Set(payload.roleNames ?? []))
		const roleRows = roleNames.length
			? await db.select().from(roles).where(inArray(roles.name, roleNames))
			: []
		const foundRoleNames = new Set(roleRows.map(r => r.name))
		const missingRoles = roleNames.filter(name => !foundRoleNames.has(name))
		if (missingRoles.length) {
			throw new ORPCError("BAD_REQUEST", { message: `Unknown roles: ${missingRoles.join(", ")}` })
		}

		const userId = randomUUID()

		// This path writes the credential row itself rather than going through
		// Better Auth, so the `hooks.before` policy gate never sees it. Validate
		// here or an administrator could mint a credential the sign-in flow and
		// the password-reset flow would both refuse.
		if (payload.password !== undefined) {
			const policy = validatePassword(payload.password, { email, name: payload.name })
			if (!policy.ok) {
				await this.auditService.record({
					actorId,
					action: "user.created",
					module: AUDIT_MODULE,
					outcome: "denied",
					entityType: "user",
					entityId: email,
					reason: "Password does not meet the policy",
					metadata: { failedRules: policy.failedRuleIds },
				})
				throw new ORPCError("BAD_REQUEST", {
					message: policy.message ?? "Password does not meet the policy.",
				})
			}
		}

		// Invite-style: synthesize a temporary password when omitted. Generated
		// to satisfy the policy by construction, so the holder is never issued a
		// credential that the policy would reject on their first change.
		const plaintext = payload.password ?? generateCompliantPassword()
		const hashedPassword = this.hashPassword(plaintext)
		const now = new Date()
		const divisionId = payload.divisionId ?? null

		await db.transaction(async tx => {
			await tx.insert(users).values({
				id: userId,
				name: payload.name,
				email,
				emailVerified: false,
				image: null,
				isActive: true,
				divisionId,
				createdAt: now,
				updatedAt: now,
			})

			await tx.insert(accounts).values({
				providerId: "credential",
				accountId: userId,
				userId,
				password: hashedPassword,
				createdAt: now,
				updatedAt: now,
			})

			if (roleRows.length) {
				await tx
					.insert(userRoles)
					.values(roleRows.map(role => ({ userId, roleId: role.id })))
					.onConflictDoNothing()
			}
		})

		// New user has no cache entry yet, but invalidate defensively.
		await this.cacheService.invalidate(userId)

		await this.auditService.record({
			actorId,
			action: "user.created",
			module: AUDIT_MODULE,
			entityType: "user",
			entityId: userId,
			metadata: {
				email,
				roles: roleNames,
				divisionId,
				invite: payload.password === undefined,
			},
		})

		return this.buildUser(userId)
	}

	/** Update a user's profile (name / email). */
	async updateUser(
		payload: UpdateUserRequest,
		actorId: string | null = null
	): Promise<UserWithRoles> {
		const user = await this.getUserRowOrThrow(payload.userId)

		const nextEmail = payload.email !== undefined ? payload.email.trim().toLowerCase() : undefined
		if (nextEmail !== undefined && nextEmail !== user.email) {
			const [clash] = await db.select().from(users).where(eq(users.email, nextEmail))
			if (clash) {
				throw new ORPCError("CONFLICT", {
					message: `A user with email "${nextEmail}" already exists`,
				})
			}
		}

		await db
			.update(users)
			.set({
				name: payload.name ?? user.name,
				email: nextEmail ?? user.email,
				updatedAt: new Date(),
			})
			.where(eq(users.id, user.id))

		await this.cacheService.invalidate(user.id)

		await this.auditService.record({
			actorId,
			action: "user.updated",
			module: AUDIT_MODULE,
			entityType: "user",
			entityId: user.id,
			metadata: {
				name: payload.name ?? user.name,
				emailChanged: nextEmail !== undefined && nextEmail !== user.email,
			},
		})

		return this.buildUser(user.id)
	}

	/** Activate or deactivate a user (soft deactivation; record/credentials kept). */
	async setUserActive(
		payload: SetUserActiveRequest,
		actorId: string | null = null
	): Promise<UserWithRoles> {
		const user = await this.getUserRowOrThrow(payload.userId)

		await db
			.update(users)
			.set({ isActive: payload.isActive, updatedAt: new Date() })
			.where(eq(users.id, user.id))

		// Critical: drop the cached permission set so the new active flag is
		// enforced by the RbacGuard on the very next request.
		await this.cacheService.invalidate(user.id)

		await this.auditService.record({
			actorId,
			action: payload.isActive ? "user.reactivated" : "user.deactivated",
			module: AUDIT_MODULE,
			entityType: "user",
			entityId: user.id,
			metadata: { isActive: payload.isActive },
		})

		return this.buildUser(user.id)
	}

	// Audit is NOT written here: rbacService.assignRole records `role.assign`
	// inside the same transaction as the grant, along with the privilege-escalation
	// guard. Writing a second entry here would double-count every assignment.
	async assignUserRole(payload: AssignRoleRequest, actorId: string | null = null) {
		await this.rbacService.assignRole(payload.userId, payload.roleName, actorId)

		return { success: true, userId: payload.userId, roleName: payload.roleName }
	}

	// See assignUserRole: rbacService.removeRole owns the audit entry and the
	// last-Admin protection, both inside the revoking transaction.
	async removeUserRole(payload: RemoveRoleRequest, actorId: string | null = null) {
		await this.rbacService.removeRole(payload.userId, payload.roleName, actorId)

		return { success: true, userId: payload.userId, roleName: payload.roleName }
	}

	async assignUserDivision(
		payload: AssignUserDivisionRequest,
		actorId: string | null = null
	): Promise<AssignUserDivisionResponse> {
		const [user] = await db.select().from(users).where(eq(users.id, payload.userId))
		if (!user) {
			throw new ORPCError("NOT_FOUND", { message: `User with ID ${payload.userId} not found` })
		}

		if (payload.divisionId !== null) {
			const [division] = await db
				.select()
				.from(divisions)
				.where(eq(divisions.id, payload.divisionId))
			if (!division) {
				throw new ORPCError("NOT_FOUND", {
					message: `Division with ID ${payload.divisionId} not found`,
				})
			}
		}

		await db
			.update(users)
			.set({ divisionId: payload.divisionId, updatedAt: new Date() })
			.where(eq(users.id, payload.userId))

		// Division drives row-level scoping; invalidate just this user's cache.
		await this.cacheService.invalidate(payload.userId)

		await this.auditService.record({
			actorId,
			action: "user.division_assigned",
			module: AUDIT_MODULE,
			entityType: "user",
			entityId: payload.userId,
			metadata: { divisionId: payload.divisionId },
		})

		return { success: true, userId: payload.userId, divisionId: payload.divisionId }
	}

	// -------------------------------------------------------------- helpers
	/**
	 * Validate the given permission names against the catalog and replace the
	 * role's full permission set within a transaction. Does not touch the cache;
	 * callers decide invalidation scope.
	 */
	private async replaceRolePermissions(
		roleId: number,
		names: readonly PermissionName[]
	): Promise<void> {
		const uniqueNames = Array.from(new Set(names))
		const permissionRows = uniqueNames.length
			? await db.select().from(permissions).where(inArray(permissions.name, uniqueNames))
			: []

		const foundNames = new Set(permissionRows.map(p => p.name))
		const missing = uniqueNames.filter(name => !foundNames.has(name))
		if (missing.length) {
			throw new ORPCError("BAD_REQUEST", { message: `Unknown permissions: ${missing.join(", ")}` })
		}

		await db.transaction(async tx => {
			await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
			if (permissionRows.length) {
				await tx
					.insert(rolePermissions)
					.values(permissionRows.map(p => ({ roleId, permissionId: p.id })))
			}
		})
	}

	/**
	 * Hash a plaintext password into Better Auth's default scrypt `salt:hash`
	 * format. Parameters mirror the seed's hashing exactly so credentials created
	 * here verify against Better Auth's email/password sign-in.
	 */
	private hashPassword(password: string): string {
		const saltHex = randomBytes(16).toString("hex")
		const key = scryptSync(password.normalize("NFKC"), saltHex, 64, {
			N: 16384,
			r: 16,
			p: 1,
			maxmem: 128 * 16384 * 16 * 2,
		})
		return `${saltHex}:${key.toString("hex")}`
	}

	private async getUserRowOrThrow(userId: string) {
		const [user] = await db.select().from(users).where(eq(users.id, userId))
		if (!user) {
			throw new ORPCError("NOT_FOUND", { message: `User with ID ${userId} not found` })
		}
		return user
	}

	/** Build the {@link UserWithRoles} view for a single user id. */
	private async buildUser(userId: string): Promise<UserWithRoles> {
		const [user] = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				isActive: users.isActive,
				divisionId: users.divisionId,
				divisionName: divisions.name,
			})
			.from(users)
			.leftJoin(divisions, eq(users.divisionId, divisions.id))
			.where(eq(users.id, userId))

		if (!user) {
			throw new ORPCError("NOT_FOUND", { message: `User with ID ${userId} not found` })
		}

		const roleRows = await db
			.select({ name: roles.name })
			.from(userRoles)
			.innerJoin(roles, eq(userRoles.roleId, roles.id))
			.where(eq(userRoles.userId, userId))

		return {
			id: user.id,
			name: user.name,
			email: user.email,
			roles: roleRows.map(r => r.name).sort(),
			isActive: user.isActive,
			divisionId: user.divisionId ?? null,
			divisionName: user.divisionName ?? null,
		}
	}

	private async getRoleRowOrThrow(id: number) {
		const [role] = await db.select().from(roles).where(eq(roles.id, id))
		if (!role) {
			throw new ORPCError("NOT_FOUND", { message: `Role with ID ${id} not found` })
		}
		return role
	}

	private async buildRole(id: number): Promise<Role> {
		const role = await this.getRoleRowOrThrow(id)

		const permRows = await db
			.select({ name: permissions.name })
			.from(rolePermissions)
			.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
			.where(eq(rolePermissions.roleId, id))

		const [{ count } = { count: 0 }] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(userRoles)
			.where(eq(userRoles.roleId, id))

		const grantedPermissions = permRows
			.map(p => p.name)
			.filter((name): name is PermissionName => PERMISSION_CATALOG.has(name))

		return {
			id: role.id,
			name: role.name,
			description: role.description,
			permissions: this.orderPermissions(grantedPermissions),
			userCount: count,
			createdAt: role.createdAt,
			updatedAt: role.updatedAt,
		}
	}

	private orderPermissions(names: PermissionName[]): PermissionName[] {
		const held = new Set(names)
		return PERMISSION_NAMES.filter(name => held.has(name))
	}
}
