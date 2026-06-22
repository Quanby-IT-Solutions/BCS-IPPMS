import "dotenv/config"

import { randomBytes, scryptSync } from "node:crypto"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { and, eq, inArray, like, or } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import {
	ADMIN_ROLE,
	PERMISSION_CATALOG,
	PERMISSION_NAMES,
	ROLE_NAMES,
	type PermissionMeta,
	type PermissionName,
	type RoleName,
} from "@repo/contracts"

import {
	accounts,
	approvalActions,
	approvalRequests,
	approvalSteps,
	approvalWorkflows,
	auditLogs,
	divisions,
	files,
	notifications,
	permissions,
	projectClosures,
	projectMilestones,
	projects,
	projectTasks,
	rolePermissions,
	roles,
	schema,
	tickets,
	todos,
	userRoles,
	users,
} from "./schema.js"

async function hashPassword(password: string): Promise<string> {
	const saltHex = randomBytes(16).toString("hex")
	const key = scryptSync(password.normalize("NFKC"), saltHex, 64, {
		N: 16384,
		r: 16,
		p: 1,
		maxmem: 128 * 16384 * 16 * 2,
	})

	return `${saltHex}:${key.toString("hex")}`
}

// ---------------------------------------------------------------------------
// Storage path resolution (for downloadable seed file attachments)
// ---------------------------------------------------------------------------
// The seed runs from `packages/db` (pnpm sets the package cwd), but the backend
// resolves STORAGE_ROOT relative to ITS own cwd (`apps/backend`). To make seeded
// downloads resolvable, mirror that: honor an absolute STORAGE_ROOT, otherwise
// resolve the (default "storage") relative path against `apps/backend`.
const seedDir = dirname(fileURLToPath(import.meta.url)) // packages/db/src
const repoRoot = resolve(seedDir, "../../..") // -> monorepo root

function resolveStorageRoot(): string {
	const configured = process.env.STORAGE_ROOT
	if (configured && isAbsolute(configured)) return configured
	return resolve(repoRoot, "apps/backend", configured ?? "storage")
}

// ---------------------------------------------------------------------------
// Seed role names
// ---------------------------------------------------------------------------
// Custom IPPMS demo roles live alongside the canonical ROLE_NAMES. The roles
// table accepts arbitrary names; we keep types valid locally with a seed-only
// union rather than mutating the shared ROLE_NAMES contract.
const BCS_ROLE_NAMES = ["Planner", "Approver", "Executor"] as const
type BcsRoleName = (typeof BCS_ROLE_NAMES)[number]
type SeedRoleName = RoleName | BcsRoleName

async function seedDatabase() {
	const connectionString = process.env.DATABASE_URL

	if (!connectionString) {
		throw new Error("DATABASE_URL environment variable is not set")
	}

	const pool = new Pool({ connectionString })
	const db = drizzle({ client: pool, schema })
	const now = new Date()
	const day = 24 * 60 * 60 * 1000
	const daysFromNow = (n: number) => new Date(now.getTime() + n * day)
	const daysAgo = (n: number) => new Date(now.getTime() - n * day)
	const seedPassword = "password123"
	const hashedSeedPassword = await hashPassword(seedPassword)

	// `.returning()` yields an array; under noUncheckedIndexedAccess the first
	// element is `T | undefined`. Narrow it (and fail loudly) in one place.
	const requireRow = <T>(rows: T[], what: string): T => {
		const row = rows[0]
		if (!row) throw new Error(`Seed expected a returned row for ${what}`)
		return row
	}

	// -----------------------------------------------------------------------
	// Template users (preserved from the original template seed).
	// -----------------------------------------------------------------------
	const templateUsers: Array<typeof users.$inferInsert> = [
		{
			id: "seed-user-admin",
			name: "Admin User",
			email: "admin@turbo-template.local",
			emailVerified: true,
			image: null,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "seed-user-alex",
			name: "Alex Johnson",
			email: "alex@turbo-template.local",
			emailVerified: true,
			image: null,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "seed-user-sam",
			name: "Sam Rivera",
			email: "sam@turbo-template.local",
			emailVerified: false,
			image: null,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]

	// -----------------------------------------------------------------------
	// BCS IPPMS development accounts (deterministic IDs for quick dev login).
	// -----------------------------------------------------------------------
	const BCS_ADMIN = "seed-bcs-admin"
	const BCS_PLANNER_OPS = "seed-bcs-planner-ops"
	const BCS_APPROVER_OPS = "seed-bcs-approver-ops"
	const BCS_EXECUTOR_OPS = "seed-bcs-executor-ops"
	const BCS_PLANNER_RD = "seed-bcs-planner-rd"
	const BCS_APPROVER_RD = "seed-bcs-approver-rd"

	const bcsUsers: Array<typeof users.$inferInsert> = [
		{
			id: BCS_ADMIN,
			name: "BCS Administrator",
			email: "admin@bcs.local",
			emailVerified: true,
			image: null,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: BCS_PLANNER_OPS,
			name: "Olivia Planner (Operations)",
			email: "planner.ops@bcs.local",
			emailVerified: true,
			image: null,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: BCS_APPROVER_OPS,
			name: "Marcus Approver (Operations)",
			email: "approver.ops@bcs.local",
			emailVerified: true,
			image: null,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: BCS_EXECUTOR_OPS,
			name: "Ethan Executor (Operations)",
			email: "executor.ops@bcs.local",
			emailVerified: true,
			image: null,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: BCS_PLANNER_RD,
			name: "Rita Planner (R&D)",
			email: "planner.rd@bcs.local",
			emailVerified: true,
			image: null,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: BCS_APPROVER_RD,
			name: "Diana Approver (R&D)",
			email: "approver.rd@bcs.local",
			emailVerified: true,
			image: null,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]

	const seedUsers = [...templateUsers, ...bcsUsers]
	const bcsUserIds = bcsUsers.map(u => u.id)

	// Generic placeholder BCS-style divisions. Names are the conflict target.
	const seedDivisions: Array<typeof divisions.$inferInsert> = [
		{
			name: "Administration",
			description: "Corporate administration and executive office",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			name: "Finance",
			description: "Budgeting, accounting, and financial management",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			name: "Operations",
			description: "Field operations and service delivery",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			name: "Research & Development",
			description: "Research, planning, and development initiatives",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			name: "Information Technology",
			description: "Systems, infrastructure, and software services",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]

	// User id -> division name. Admin/global users stay null (no single-division).
	const userDivisionAssignments: Record<string, string> = {
		"seed-user-alex": "Operations",
		"seed-user-sam": "Research & Development",
		[BCS_PLANNER_OPS]: "Operations",
		[BCS_APPROVER_OPS]: "Operations",
		[BCS_EXECUTOR_OPS]: "Operations",
		[BCS_PLANNER_RD]: "Research & Development",
		[BCS_APPROVER_RD]: "Research & Development",
	}

	const seedTodos: Array<typeof todos.$inferInsert> = [
		{
			title: "Review onboarding checklist",
			completed: true,
			authorId: "seed-user-admin",
			createdAt: now,
			updatedAt: now,
		},
		{
			title: "Verify backend health endpoint",
			completed: false,
			authorId: "seed-user-admin",
			createdAt: now,
			updatedAt: now,
		},
		{
			title: "Connect mobile app to local API",
			completed: false,
			authorId: "seed-user-alex",
			createdAt: now,
			updatedAt: now,
		},
		{
			title: "Draft release notes for staging",
			completed: false,
			authorId: "seed-user-sam",
			createdAt: now,
			updatedAt: now,
		},
	]

	const seedTickets: Array<typeof tickets.$inferInsert> = [
		{
			name: "Admin User",
			email: "admin@turbo-template.local",
			subject: "Initial admin setup check",
			priority: "high" as const,
			concern: "Please verify seeded admin data appears correctly across the dashboard.",
			status: "in_progress" as const,
			authorId: "seed-user-admin",
			createdAt: now,
			updatedAt: now,
		},
		{
			name: "Alex Johnson",
			email: "alex@turbo-template.local",
			subject: "Mobile API connectivity",
			priority: "medium" as const,
			concern: "Android emulator needs a stable local API URL during development.",
			status: "received" as const,
			authorId: "seed-user-alex",
			createdAt: now,
			updatedAt: now,
		},
		{
			name: "Guest Reporter",
			email: "guest@turbo-template.local",
			subject: "Public feedback sample",
			priority: "low" as const,
			concern: "This anonymous ticket exists to test support workflows without a linked account.",
			status: "received" as const,
			authorId: null,
			createdAt: now,
			updatedAt: now,
		},
	]

	const seededUserIds = seedUsers.map(user => user.id)
	const seededTicketEmails = seedTickets.map(ticket => ticket.email)
	const seedCredentialAccounts: Array<typeof accounts.$inferInsert> = seedUsers.map(user => ({
		providerId: "credential",
		accountId: user.id,
		userId: user.id,
		password: hashedSeedPassword,
		createdAt: now,
		updatedAt: now,
	}))

	const roleDescriptions: Record<RoleName, string> = {
		Admin: "Super-administrator; full access via role-name short-circuit",
		Manager: "Can manage posts and read users",
		User: "Standard user with read access to posts",
	}

	const bcsRoleDescriptions: Record<BcsRoleName, string> = {
		Planner: "Creates, plans and submits projects; manages tasks and milestones",
		Approver: "Reviews and acts on approval requests within their division",
		Executor: "Executes assigned project tasks and uploads deliverables",
	}

	const seedRoles: Array<typeof roles.$inferInsert> = [
		...ROLE_NAMES.map(name => ({
			name,
			description: roleDescriptions[name],
			createdAt: now,
			updatedAt: now,
		})),
		...BCS_ROLE_NAMES.map(name => ({
			name,
			description: bcsRoleDescriptions[name],
			createdAt: now,
			updatedAt: now,
		})),
	]

	// Defensive: the catalog (PERMISSION_NAMES) is owned by T2 and may expand.
	// Known descriptions are looked up; unknown names fall back to a derived label.
	const permissionDescriptions: Partial<Record<PermissionName, string>> = {
		"posts:read": "Read posts",
		"posts:create": "Create posts",
		"posts:edit": "Edit posts",
		"posts:delete": "Delete posts",
		"posts:*": "All actions on posts",
		"users:read": "Read user profiles",
		"users:manage": "Manage users",
	}

	const describePermission = (name: PermissionName): string => {
		const known = permissionDescriptions[name]
		if (known) return known

		const [resource, action] = name.split(":")
		if (!action) return name
		if (action === "*") return `All actions on ${resource}`
		return `${action.charAt(0).toUpperCase()}${action.slice(1)} ${resource}`
	}

	// Index the shared catalog by name so we can populate the optional hierarchy
	// metadata columns (module / sub_module / action) added by T1.
	const permissionMetaByName = new Map<PermissionName, PermissionMeta>(
		PERMISSION_CATALOG.map(entry => [entry.name, entry])
	)

	// Consistency guard: PERMISSION_CATALOG must cover every PERMISSION_NAMES
	// entry. If they drift, fail loudly here rather than silently seeding rows
	// with missing metadata. (TS already checks the reverse direction at build
	// time via the PermissionName cast in the catalog.)
	const uncatalogued = PERMISSION_NAMES.filter(name => !permissionMetaByName.has(name))
	if (uncatalogued.length > 0) {
		throw new Error(
			`PERMISSION_CATALOG is missing metadata for: ${uncatalogued.join(", ")}. ` +
				`Keep PERMISSION_CATALOG in sync with PERMISSION_NAMES in @repo/contracts.`
		)
	}

	const seedPermissions: Array<typeof permissions.$inferInsert> = PERMISSION_NAMES.map(name => {
		const meta = permissionMetaByName.get(name)
		return {
			name,
			// Prefer the catalog description; fall back to the defensive deriver so
			// the seed stays runnable even if metadata is ever absent.
			description: meta?.description ?? describePermission(name),
			module: meta?.module ?? null,
			subModule: meta?.subModule ?? null,
			action: meta?.action ?? null,
			createdAt: now,
			updatedAt: now,
		}
	})

	// Role -> permission names. Admin omitted: granted via role-name short-circuit.
	const rolePermissionNames: Partial<Record<SeedRoleName, PermissionName[]>> = {
		Manager: ["posts:*", "users:read"],
		User: ["posts:read"],
		// Planner: builds and submits projects, drives tasks/milestones, uploads files.
		Planner: [
			"projects:read",
			"projects:create",
			"projects:update",
			"projects:submit",
			"project-tasks:*",
			"project-milestones:*",
			"files:read",
			"files:upload",
			"files:download",
			"approval-requests:read",
			"notifications:read",
			"reports:read",
			"calendar:read",
		],
		// Approver: acts on approval requests, plus reads projects/files/reports and
		// manages workflows for demo convenience.
		Approver: [
			"approval-requests:read",
			"approval-actions:approve",
			"approval-actions:reject",
			"approval-actions:delegate",
			"approval-actions:escalate",
			"approval-workflows:*",
			"projects:read",
			"files:read",
			"files:download",
			"notifications:read",
			"reports:read",
			"analytics:read",
		],
		// Executor: reads projects, updates assigned work, uploads deliverables.
		Executor: [
			"projects:read",
			"project-tasks:read",
			"project-tasks:update",
			"project-milestones:read",
			"production:read",
			"circulation:read",
			"files:read",
			"files:upload",
			"files:download",
			"notifications:read",
		],
	}

	// User id -> role name.
	const userRoleAssignments: Array<{ userId: string; roleName: SeedRoleName }> = [
		{ userId: "seed-user-admin", roleName: ADMIN_ROLE },
		{ userId: "seed-user-alex", roleName: "User" },
		{ userId: "seed-user-sam", roleName: "User" },
		{ userId: BCS_ADMIN, roleName: ADMIN_ROLE },
		{ userId: BCS_PLANNER_OPS, roleName: "Planner" },
		{ userId: BCS_APPROVER_OPS, roleName: "Approver" },
		{ userId: BCS_EXECUTOR_OPS, roleName: "Executor" },
		{ userId: BCS_PLANNER_RD, roleName: "Planner" },
		{ userId: BCS_APPROVER_RD, roleName: "Approver" },
	]

	let rolePermissionCount = 0
	let userRoleCount = 0
	const demoCounts = {
		workflows: 0,
		projects: 0,
		milestones: 0,
		tasks: 0,
		closures: 0,
		requests: 0,
		actions: 0,
		notifications: 0,
		auditLogs: 0,
		files: 0,
	}

	// Physical file attachments to write under the storage root after commit.
	const filePayloads: Array<{ storageKey: string; content: string }> = []

	try {
		await db.transaction(async tx => {
			for (const division of seedDivisions) {
				await tx
					.insert(divisions)
					.values(division)
					.onConflictDoUpdate({
						target: divisions.name,
						set: {
							description: division.description,
							isActive: division.isActive,
							updatedAt: now,
						},
					})
			}

			const divisionRows = await tx.select().from(divisions)
			const divisionIdByName = new Map<string, number>(divisionRows.map(d => [d.name, d.id]))

			for (const user of seedUsers) {
				const divisionName = userDivisionAssignments[user.id]
				const divisionId = divisionName ? (divisionIdByName.get(divisionName) ?? null) : null

				await tx
					.insert(users)
					.values({ ...user, divisionId })
					.onConflictDoUpdate({
						target: users.id,
						set: {
							name: user.name,
							email: user.email,
							emailVerified: user.emailVerified,
							image: user.image,
							isActive: user.isActive ?? true,
							divisionId,
							updatedAt: now,
						},
					})
			}

			for (const account of seedCredentialAccounts) {
				await tx
					.insert(accounts)
					.values(account)
					.onConflictDoUpdate({
						target: [accounts.providerId, accounts.accountId],
						set: {
							userId: account.userId,
							password: account.password,
							updatedAt: now,
						},
					})
			}

			for (const role of seedRoles) {
				await tx
					.insert(roles)
					.values(role)
					.onConflictDoUpdate({
						target: roles.name,
						set: { description: role.description, updatedAt: now },
					})
			}

			for (const permission of seedPermissions) {
				await tx
					.insert(permissions)
					.values(permission)
					.onConflictDoUpdate({
						target: permissions.name,
						set: {
							description: permission.description,
							module: permission.module,
							subModule: permission.subModule,
							action: permission.action,
							updatedAt: now,
						},
					})
			}

			const roleRows = await tx.select().from(roles)
			const permissionRows = await tx.select().from(permissions)
			const roleIdByName = new Map<string, number>(roleRows.map(r => [r.name, r.id]))
			const permissionIdByName = new Map<string, number>(permissionRows.map(p => [p.name, p.id]))

			const seedRolePermissions: Array<typeof rolePermissions.$inferInsert> = []
			for (const [roleName, permNames] of Object.entries(rolePermissionNames)) {
				const roleId = roleIdByName.get(roleName)
				if (roleId === undefined || !permNames) continue
				for (const permName of permNames) {
					const permissionId = permissionIdByName.get(permName)
					if (permissionId === undefined) continue
					seedRolePermissions.push({ roleId, permissionId })
				}
			}

			for (const row of seedRolePermissions) {
				await tx.insert(rolePermissions).values(row).onConflictDoNothing()
			}
			rolePermissionCount = seedRolePermissions.length

			const seedUserRoles: Array<typeof userRoles.$inferInsert> = []
			for (const assignment of userRoleAssignments) {
				const roleId = roleIdByName.get(assignment.roleName)
				if (roleId === undefined) continue
				seedUserRoles.push({ userId: assignment.userId, roleId })
			}

			for (const row of seedUserRoles) {
				await tx.insert(userRoles).values(row).onConflictDoNothing()
			}
			userRoleCount = seedUserRoles.length

			await tx.delete(todos).where(inArray(todos.authorId, seededUserIds))

			await tx
				.delete(tickets)
				.where(
					or(inArray(tickets.email, seededTicketEmails), inArray(tickets.authorId, seededUserIds))
				)

			await tx.insert(todos).values(seedTodos)
			await tx.insert(tickets).values(seedTickets)

			// =================================================================
			// BCS IPPMS demo data (idempotent: removed by deterministic owners
			// before reinsert, in FK-safe order).
			// =================================================================
			const opsDivisionId = divisionIdByName.get("Operations")
			const rdDivisionId = divisionIdByName.get("Research & Development")
			const approverRoleId = roleIdByName.get("Approver")

			if (
				opsDivisionId === undefined ||
				rdDivisionId === undefined ||
				approverRoleId === undefined
			) {
				throw new Error(
					"BCS demo seed prerequisites missing (Operations/R&D division or Approver role)."
				)
			}

			// --- Cleanup (FK-safe order) -------------------------------------
			// Approval requests cascade to their actions; delete requests raised by
			// seeded users (and any request targeting a seeded demo workflow).
			await tx.delete(approvalRequests).where(inArray(approvalRequests.requestedBy, bcsUserIds))
			// Workflows (and their steps via cascade) for the demo module/divisions.
			await tx
				.delete(approvalWorkflows)
				.where(
					and(
						eq(approvalWorkflows.module, "projects"),
						inArray(approvalWorkflows.divisionId, [opsDivisionId, rdDivisionId])
					)
				)
			// Projects cascade to milestones, tasks and closures.
			await tx.delete(projects).where(inArray(projects.createdBy, bcsUserIds))
			// File metadata: by seeded owner or by the dev-seed storage key prefix.
			await tx
				.delete(files)
				.where(or(inArray(files.uploadedBy, bcsUserIds), like(files.storageKey, "dev-seed/%")))
			await tx.delete(notifications).where(inArray(notifications.userId, bcsUserIds))
			await tx.delete(auditLogs).where(inArray(auditLogs.actorId, bcsUserIds))

			// --- Approval workflows + steps ----------------------------------
			const opsWorkflow = requireRow(
				await tx
					.insert(approvalWorkflows)
					.values({
						module: "projects",
						divisionId: opsDivisionId,
						isActive: true,
						createdAt: now,
						updatedAt: now,
					})
					.returning(),
				"opsWorkflow"
			)
			const rdWorkflow = requireRow(
				await tx
					.insert(approvalWorkflows)
					.values({
						module: "projects",
						divisionId: rdDivisionId,
						isActive: true,
						createdAt: now,
						updatedAt: now,
					})
					.returning(),
				"rdWorkflow"
			)
			demoCounts.workflows = 2

			await tx.insert(approvalSteps).values([
				{
					workflowId: opsWorkflow.id,
					stepOrder: 1,
					approverRoleId,
					createdAt: now,
					updatedAt: now,
				},
				{
					workflowId: rdWorkflow.id,
					stepOrder: 1,
					approverRoleId,
					createdAt: now,
					updatedAt: now,
				},
			])

			// --- Projects (varied statuses) ----------------------------------
			const draftProject = requireRow(
				await tx
					.insert(projects)
					.values({
						title: "[DEV] Fleet Maintenance Tracker",
						divisionId: opsDivisionId,
						status: "draft",
						objectives: "Centralize preventive-maintenance scheduling for the service fleet.",
						scope: "All operations vehicles across regional depots.",
						deliverables: "Maintenance calendar, alerting, and compliance reporting.",
						createdBy: BCS_PLANNER_OPS,
						createdAt: daysAgo(2),
						updatedAt: daysAgo(1),
					})
					.returning(),
				"draftProject"
			)

			const pendingProject = requireRow(
				await tx
					.insert(projects)
					.values({
						title: "[DEV] Warehouse Automation Rollout",
						divisionId: opsDivisionId,
						status: "in_approval",
						objectives: "Introduce conveyor automation to cut pick-and-pack time by 30%.",
						scope: "Central distribution warehouse, phase one.",
						deliverables: "Automation design, vendor selection, pilot line.",
						createdBy: BCS_PLANNER_OPS,
						createdAt: daysAgo(5),
						updatedAt: daysAgo(1),
					})
					.returning(),
				"pendingProject"
			)

			const activeProject = requireRow(
				await tx
					.insert(projects)
					.values({
						title: "[DEV] Customer Onboarding Revamp",
						divisionId: opsDivisionId,
						status: "active",
						objectives: "Reduce onboarding time from 10 days to 3 days.",
						scope: "End-to-end customer onboarding journey.",
						deliverables: "New onboarding flow, automation, and staff playbook.",
						createdBy: BCS_PLANNER_OPS,
						createdAt: daysAgo(20),
						updatedAt: daysAgo(2),
					})
					.returning(),
				"activeProject"
			)

			const closedProject = requireRow(
				await tx
					.insert(projects)
					.values({
						title: "[DEV] Legacy System Decommission",
						divisionId: opsDivisionId,
						status: "closed",
						objectives: "Retire the legacy dispatch system and migrate to the new platform.",
						scope: "Dispatch, routing, and historical data migration.",
						deliverables: "Data migration, cutover, and decommission report.",
						createdBy: BCS_PLANNER_OPS,
						createdAt: daysAgo(90),
						updatedAt: daysAgo(10),
					})
					.returning(),
				"closedProject"
			)

			const rdProject = requireRow(
				await tx
					.insert(projects)
					.values({
						title: "[DEV] R&D Materials Study",
						divisionId: rdDivisionId,
						status: "in_approval",
						objectives: "Evaluate sustainable packaging materials for product lines.",
						scope: "Lab testing and supplier feasibility study.",
						deliverables: "Comparative study and recommendation memo.",
						createdBy: BCS_PLANNER_RD,
						createdAt: daysAgo(4),
						updatedAt: daysAgo(1),
					})
					.returning(),
				"rdProject"
			)
			demoCounts.projects = 5

			// --- Milestones --------------------------------------------------
			await tx.insert(projectMilestones).values([
				{
					projectId: activeProject.id,
					name: "Discovery",
					dueDate: daysAgo(10),
					status: "done",
					progress: 100,
					createdAt: daysAgo(20),
					updatedAt: daysAgo(10),
				},
				{
					projectId: activeProject.id,
					name: "Build",
					dueDate: daysFromNow(10),
					status: "in_progress",
					progress: 45,
					createdAt: daysAgo(15),
					updatedAt: daysAgo(2),
				},
				{
					projectId: activeProject.id,
					name: "Launch",
					dueDate: daysFromNow(30),
					status: "pending",
					progress: 0,
					createdAt: daysAgo(15),
					updatedAt: daysAgo(15),
				},
				{
					projectId: closedProject.id,
					name: "Migration",
					dueDate: daysAgo(20),
					status: "done",
					progress: 100,
					createdAt: daysAgo(90),
					updatedAt: daysAgo(20),
				},
				{
					projectId: closedProject.id,
					name: "Cutover",
					dueDate: daysAgo(12),
					status: "done",
					progress: 100,
					createdAt: daysAgo(60),
					updatedAt: daysAgo(12),
				},
			])
			demoCounts.milestones = 5

			// --- Tasks -------------------------------------------------------
			await tx.insert(projectTasks).values([
				{
					projectId: activeProject.id,
					title: "Map current onboarding flow",
					assigneeId: BCS_EXECUTOR_OPS,
					dueDate: daysAgo(8),
					status: "done",
					requirements: "Document every step with owners and SLAs.",
					createdAt: daysAgo(20),
					updatedAt: daysAgo(8),
				},
				{
					projectId: activeProject.id,
					title: "Draft new onboarding UX",
					assigneeId: BCS_EXECUTOR_OPS,
					dueDate: daysFromNow(5),
					status: "in_progress",
					requirements: "Wireframes for the 3-day onboarding journey.",
					createdAt: daysAgo(12),
					updatedAt: daysAgo(2),
				},
				{
					projectId: activeProject.id,
					title: "QA pass on automation",
					assigneeId: BCS_EXECUTOR_OPS,
					dueDate: daysFromNow(20),
					status: "todo",
					requirements: "End-to-end test of automated onboarding steps.",
					createdAt: daysAgo(10),
					updatedAt: daysAgo(10),
				},
				{
					projectId: closedProject.id,
					title: "Migrate historical dispatch data",
					assigneeId: BCS_EXECUTOR_OPS,
					dueDate: daysAgo(25),
					status: "done",
					requirements: "Validate row counts and integrity post-migration.",
					createdAt: daysAgo(80),
					updatedAt: daysAgo(25),
				},
			])
			demoCounts.tasks = 4

			// --- Closure (for the closed project) ----------------------------
			await tx.insert(projectClosures).values({
				projectId: closedProject.id,
				outcomeSummary:
					"Legacy dispatch system fully decommissioned; all traffic on the new platform.",
				objectivesMet: true,
				performanceRating: 4,
				lessonsLearned: "Earlier stakeholder sign-off would have shortened the cutover window.",
				closedBy: BCS_PLANNER_OPS,
				closedAt: daysAgo(10),
			})
			demoCounts.closures = 1

			// --- Approval requests + actions ---------------------------------
			// Pending Operations request -> lands in approver.ops inbox.
			const pendingReq = requireRow(
				await tx
					.insert(approvalRequests)
					.values({
						subjectType: "projects",
						subjectId: pendingProject.id,
						workflowId: opsWorkflow.id,
						divisionId: opsDivisionId,
						currentStepOrder: 1,
						status: "pending",
						requestedBy: BCS_PLANNER_OPS,
						createdAt: daysAgo(1),
						updatedAt: daysAgo(1),
					})
					.returning(),
				"pendingReq"
			)

			// Pending R&D request -> lands in approver.rd inbox (division scoping demo).
			await tx.insert(approvalRequests).values({
				subjectType: "projects",
				subjectId: rdProject.id,
				workflowId: rdWorkflow.id,
				divisionId: rdDivisionId,
				currentStepOrder: 1,
				status: "pending",
				requestedBy: BCS_PLANNER_RD,
				createdAt: daysAgo(1),
				updatedAt: daysAgo(1),
			})

			// Approved request history for the active project.
			const approvedActiveReq = requireRow(
				await tx
					.insert(approvalRequests)
					.values({
						subjectType: "projects",
						subjectId: activeProject.id,
						workflowId: opsWorkflow.id,
						divisionId: opsDivisionId,
						currentStepOrder: 1,
						status: "approved",
						requestedBy: BCS_PLANNER_OPS,
						createdAt: daysAgo(18),
						updatedAt: daysAgo(17),
					})
					.returning(),
				"approvedActiveReq"
			)

			// Approved request history for the closed project.
			const approvedClosedReq = requireRow(
				await tx
					.insert(approvalRequests)
					.values({
						subjectType: "projects",
						subjectId: closedProject.id,
						workflowId: opsWorkflow.id,
						divisionId: opsDivisionId,
						currentStepOrder: 1,
						status: "approved",
						requestedBy: BCS_PLANNER_OPS,
						createdAt: daysAgo(85),
						updatedAt: daysAgo(84),
					})
					.returning(),
				"approvedClosedReq"
			)
			demoCounts.requests = 4

			await tx.insert(approvalActions).values([
				{
					requestId: approvedActiveReq.id,
					stepOrder: 1,
					actorId: BCS_APPROVER_OPS,
					action: "approve",
					note: "Approved; proceed to execution.",
					createdAt: daysAgo(17),
				},
				{
					requestId: approvedClosedReq.id,
					stepOrder: 1,
					actorId: BCS_APPROVER_OPS,
					action: "approve",
					note: "Approved decommission plan.",
					createdAt: daysAgo(84),
				},
			])
			demoCounts.actions = 2

			// --- File attachments (active project) ---------------------------
			const fileRows: Array<typeof files.$inferInsert> = [
				{
					storageKey: "dev-seed/onboarding-brief.txt",
					originalName: "onboarding-brief.txt",
					mimeType: "text/plain",
					size: 0,
					ownerType: "projects",
					ownerId: activeProject.id,
					uploadedBy: BCS_PLANNER_OPS,
					createdAt: daysAgo(14),
				},
				{
					storageKey: "dev-seed/onboarding-spec.txt",
					originalName: "onboarding-spec.txt",
					mimeType: "text/plain",
					size: 0,
					ownerType: "projects",
					ownerId: activeProject.id,
					uploadedBy: BCS_PLANNER_OPS,
					createdAt: daysAgo(12),
				},
			]
			const fileContents: Record<string, string> = {
				"dev-seed/onboarding-brief.txt":
					"[DEV SEED] Customer Onboarding Revamp - Project Brief\n\nGoal: cut onboarding from 10 days to 3 days.\n",
				"dev-seed/onboarding-spec.txt":
					"[DEV SEED] Customer Onboarding Revamp - Technical Spec\n\nAutomation steps, integrations, and rollout plan.\n",
			}
			for (const row of fileRows) {
				const content = fileContents[row.storageKey] ?? ""
				row.size = Buffer.byteLength(content)
				filePayloads.push({ storageKey: row.storageKey, content })
			}
			await tx.insert(files).values(fileRows)
			demoCounts.files = fileRows.length

			// --- Notifications -----------------------------------------------
			await tx.insert(notifications).values([
				{
					userId: BCS_APPROVER_OPS,
					type: "approval",
					title: "New approval request",
					body: "Warehouse Automation Rollout is awaiting your approval.",
					linkPath: "/approvals",
					isRead: false,
					createdAt: daysAgo(1),
				},
				{
					userId: BCS_APPROVER_RD,
					type: "approval",
					title: "New approval request",
					body: "R&D Materials Study is awaiting your approval.",
					linkPath: "/approvals",
					isRead: false,
					createdAt: daysAgo(1),
				},
				{
					userId: BCS_PLANNER_OPS,
					type: "approval",
					title: "Project approved",
					body: "Customer Onboarding Revamp was approved.",
					linkPath: `/projects/${activeProject.id}`,
					isRead: true,
					createdAt: daysAgo(17),
				},
				{
					userId: BCS_EXECUTOR_OPS,
					type: "task",
					title: "Task assigned",
					body: "You were assigned: Draft new onboarding UX.",
					linkPath: `/projects/${activeProject.id}`,
					isRead: false,
					createdAt: daysAgo(12),
				},
				{
					userId: BCS_ADMIN,
					type: "system",
					title: "Welcome to BCS IPPMS",
					body: "Development seed data is ready to explore.",
					linkPath: "/",
					isRead: false,
					createdAt: now,
				},
			])
			demoCounts.notifications = 5

			// --- Audit logs (recent activity) --------------------------------
			await tx.insert(auditLogs).values([
				{
					actorId: BCS_PLANNER_OPS,
					action: "project.create",
					module: "projects",
					entityType: "project",
					entityId: String(pendingProject.id),
					metadata: { title: pendingProject.title },
					createdAt: daysAgo(5),
				},
				{
					actorId: BCS_PLANNER_OPS,
					action: "project.submit",
					module: "approvals",
					entityType: "approval_request",
					entityId: String(pendingReq.id),
					metadata: { projectId: pendingProject.id },
					createdAt: daysAgo(1),
				},
				{
					actorId: BCS_APPROVER_OPS,
					action: "approval.approve",
					module: "approvals",
					entityType: "approval_request",
					entityId: String(approvedActiveReq.id),
					metadata: { projectId: activeProject.id },
					createdAt: daysAgo(17),
				},
				{
					actorId: BCS_PLANNER_OPS,
					action: "project.close",
					module: "projects",
					entityType: "project",
					entityId: String(closedProject.id),
					metadata: { title: closedProject.title },
					createdAt: daysAgo(10),
				},
				{
					actorId: BCS_PLANNER_RD,
					action: "project.create",
					module: "projects",
					entityType: "project",
					entityId: String(rdProject.id),
					metadata: { title: rdProject.title },
					createdAt: daysAgo(4),
				},
			])
			demoCounts.auditLogs = 5

			// Reference draftProject so it isn't flagged as unused; it exists purely
			// to demonstrate the "draft" status in the projects list.
			void draftProject
		})

		// --- Physical file writes (after commit) -----------------------------
		// Mirror the backend's resolution so seeded downloads resolve. We rewrite
		// the whole dev-seed directory for clean idempotency.
		const storageRoot = resolveStorageRoot()
		const devSeedDir = join(storageRoot, "dev-seed")
		await rm(devSeedDir, { recursive: true, force: true })
		await mkdir(devSeedDir, { recursive: true })
		for (const payload of filePayloads) {
			await writeFile(join(storageRoot, payload.storageKey), payload.content)
		}

		console.log(
			`Seeded ${seedUsers.length} users, ${seedCredentialAccounts.length} credential accounts, ${seedDivisions.length} divisions, ${seedTodos.length} todos, and ${seedTickets.length} tickets.\n` +
				`RBAC: ${seedRoles.length} roles, ${seedPermissions.length} permissions, ${rolePermissionCount} role-permission mappings, ${userRoleCount} user-role assignments.\n` +
				`IPPMS demo: ${demoCounts.workflows} approval workflows, ${demoCounts.projects} projects, ${demoCounts.milestones} milestones, ${demoCounts.tasks} tasks, ${demoCounts.closures} closure, ${demoCounts.requests} approval requests, ${demoCounts.actions} actions, ${demoCounts.files} files, ${demoCounts.notifications} notifications, ${demoCounts.auditLogs} audit logs.\n` +
				`Storage: file attachments written under ${join(resolveStorageRoot(), "dev-seed")}\n` +
				`\nDev quick-login accounts (password: ${seedPassword}):\n` +
				`  admin@bcs.local        (Admin, global)\n` +
				`  planner.ops@bcs.local  (Planner, Operations)\n` +
				`  approver.ops@bcs.local (Approver, Operations)\n` +
				`  executor.ops@bcs.local (Executor, Operations)\n` +
				`  planner.rd@bcs.local   (Planner, R&D)\n` +
				`  approver.rd@bcs.local  (Approver, R&D)\n` +
				`Default password: ${seedPassword}`
		)
	} finally {
		await pool.end()
	}
}

void seedDatabase().catch(error => {
	console.error("Database seeding failed.")
	console.error(error)
	process.exitCode = 1
})
