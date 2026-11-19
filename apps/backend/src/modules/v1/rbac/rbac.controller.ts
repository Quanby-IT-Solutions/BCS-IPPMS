import { Controller, UseInterceptors } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { RbacService } from "@/common/rbac/rbac.service"
import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"
import { StrictThrottle } from "@/shared/decorators/strict-throttle.decorator"
import { IdempotencyInterceptor } from "@/shared/interceptors/idempotency.interceptor"

import { RbacAdminService } from "./rbac-admin.service"

/**
 * The user to attribute a privileged mutation to.
 *
 * Null rather than throwing: every route here already requires a permission,
 * so an absent session means the guard let something through and the safer
 * outcome is an entry recording that the actor was unknown, not a lost audit
 * row.
 */
function actorId(session?: UserSession): string | null {
	return session?.user?.id ?? null
}

@Controller()
export class RbacController {
	constructor(
		private readonly rbacAdminService: RbacAdminService,
		private readonly rbacService: RbacService
	) {}

	// ---------------------------------------------------------------- roles
	@RequirePermissions("roles:read")
	@Implement(v1.rbac.roles.list)
	async listRoles() {
		return implement(v1.rbac.roles.list).handler(async () => {
			return this.rbacAdminService.listRoles()
		})
	}

	@StrictThrottle()
	@RequirePermissions("roles:create")
	@UseInterceptors(IdempotencyInterceptor)
	@Implement(v1.rbac.roles.create)
	async createRole(@Session() session?: UserSession) {
		return implement(v1.rbac.roles.create).handler(async ({ input }) => {
			return this.rbacAdminService.createRole(input, actorId(session))
		})
	}

	@StrictThrottle()
	@RequirePermissions("roles:update")
	@UseInterceptors(IdempotencyInterceptor)
	@Implement(v1.rbac.roles.update)
	async updateRole(@Session() session?: UserSession) {
		return implement(v1.rbac.roles.update).handler(async ({ input }) => {
			return this.rbacAdminService.updateRole(input, actorId(session))
		})
	}

	// Changing a role's permission set needs both editing the role and assigning
	// permissions (AND semantics); Admin/wildcard still bypass via the guard.
	@StrictThrottle()
	@RequirePermissions("roles:update", "permissions:assign")
	@UseInterceptors(IdempotencyInterceptor)
	@Implement(v1.rbac.roles.setPermissions)
	async setRolePermissions(@Session() session?: UserSession) {
		return implement(v1.rbac.roles.setPermissions).handler(async ({ input }) => {
			return this.rbacAdminService.setRolePermissions(input, actorId(session))
		})
	}

	@StrictThrottle()
	@RequirePermissions("roles:delete")
	@UseInterceptors(IdempotencyInterceptor)
	@Implement(v1.rbac.roles.delete)
	async deleteRole(@Session() session?: UserSession) {
		return implement(v1.rbac.roles.delete).handler(async ({ input }) => {
			return this.rbacAdminService.deleteRole(input.id, actorId(session))
		})
	}

	// ---------------------------------------------------------- permissions
	@RequirePermissions("permissions:read")
	@Implement(v1.rbac.permissions.list)
	async listPermissions() {
		return implement(v1.rbac.permissions.list).handler(async () => {
			return this.rbacAdminService.listPermissions()
		})
	}

	// ---------------------------------------------------------------- users
	// The LIST needs `users:read`; the EMAIL ADDRESSES additionally
	// need `users:read-directory`. Splitting them means ticket triage no longer
	// carries the full directory.
	@RequirePermissions("users:read")
	@Implement(v1.rbac.users.list)
	async listUsers(@Session() session?: UserSession) {
		return implement(v1.rbac.users.list).handler(async () => {
			const userId = session?.user?.id
			const includeDirectory = userId
				? await this.rbacService.hasPermission(userId, "users:read-directory")
				: false

			return this.rbacAdminService.listUsers(includeDirectory)
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:create")
	@UseInterceptors(IdempotencyInterceptor)
	@Implement(v1.rbac.users.create)
	async createUser(@Session() session?: UserSession) {
		return implement(v1.rbac.users.create).handler(async ({ input }) => {
			return this.rbacAdminService.createUser(input, actorId(session))
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:update")
	@UseInterceptors(IdempotencyInterceptor)
	@Implement(v1.rbac.users.update)
	async updateUser(@Session() session?: UserSession) {
		return implement(v1.rbac.users.update).handler(async ({ input }) => {
			return this.rbacAdminService.updateUser(input, actorId(session))
		})
	}

	// Soft deactivate/reactivate is the closest analogue to deletion for a user
	// account (the record + credentials are retained), so it is gated by users:delete.
	@StrictThrottle()
	@RequirePermissions("users:delete")
	@UseInterceptors(IdempotencyInterceptor)
	@Implement(v1.rbac.users.setActive)
	async setUserActive(@Session() session?: UserSession) {
		return implement(v1.rbac.users.setActive).handler(async ({ input }) => {
			return this.rbacAdminService.setUserActive(input, actorId(session))
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@UseInterceptors(IdempotencyInterceptor)
	@Implement(v1.rbac.users.assignRole)
	async assignRole(@Session() session?: UserSession) {
		return implement(v1.rbac.users.assignRole).handler(async ({ input }) => {
			return this.rbacAdminService.assignUserRole(input, actorId(session))
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@UseInterceptors(IdempotencyInterceptor)
	@Implement(v1.rbac.users.removeRole)
	async removeRole(@Session() session?: UserSession) {
		return implement(v1.rbac.users.removeRole).handler(async ({ input }) => {
			return this.rbacAdminService.removeUserRole(input, actorId(session))
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@UseInterceptors(IdempotencyInterceptor)
	@Implement(v1.rbac.users.assignDivision)
	async assignDivision(@Session() session?: UserSession) {
		return implement(v1.rbac.users.assignDivision).handler(async ({ input }) => {
			return this.rbacAdminService.assignUserDivision(input, actorId(session))
		})
	}
}
