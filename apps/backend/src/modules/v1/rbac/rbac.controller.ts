import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { RbacAdminService } from "./rbac-admin.service"

@Controller()
export class RbacController {
	constructor(private readonly rbacAdminService: RbacAdminService) {}

	// ---------------------------------------------------------------- roles
	@RequirePermissions("roles:read")
	@Implement(v1.rbac.roles.list)
	async listRoles() {
		return implement(v1.rbac.roles.list).handler(async () => {
			return this.rbacAdminService.listRoles()
		})
	}

	@RequirePermissions("roles:create")
	@Implement(v1.rbac.roles.create)
	async createRole(@Session() session?: UserSession) {
		return implement(v1.rbac.roles.create).handler(async ({ input }) => {
			return this.rbacAdminService.createRole(input, session?.user?.id ?? null)
		})
	}

	@RequirePermissions("roles:update")
	@Implement(v1.rbac.roles.update)
	async updateRole(@Session() session?: UserSession) {
		return implement(v1.rbac.roles.update).handler(async ({ input }) => {
			return this.rbacAdminService.updateRole(input, session?.user?.id ?? null)
		})
	}

	// Changing a role's permission set needs both editing the role and assigning
	// permissions (AND semantics); Admin/wildcard still bypass via the guard.
	@RequirePermissions("roles:update", "permissions:assign")
	@Implement(v1.rbac.roles.setPermissions)
	async setRolePermissions(@Session() session?: UserSession) {
		return implement(v1.rbac.roles.setPermissions).handler(async ({ input }) => {
			return this.rbacAdminService.setRolePermissions(input, session?.user?.id ?? null)
		})
	}

	@RequirePermissions("roles:delete")
	@Implement(v1.rbac.roles.delete)
	async deleteRole(@Session() session?: UserSession) {
		return implement(v1.rbac.roles.delete).handler(async ({ input }) => {
			return this.rbacAdminService.deleteRole(input.id, session?.user?.id ?? null)
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
	@RequirePermissions("users:read")
	@Implement(v1.rbac.users.list)
	async listUsers() {
		return implement(v1.rbac.users.list).handler(async () => {
			return this.rbacAdminService.listUsers()
		})
	}

	@RequirePermissions("users:create")
	@Implement(v1.rbac.users.create)
	async createUser(@Session() session?: UserSession) {
		return implement(v1.rbac.users.create).handler(async ({ input }) => {
			return this.rbacAdminService.createUser(input, session?.user?.id ?? null)
		})
	}

	@RequirePermissions("users:update")
	@Implement(v1.rbac.users.update)
	async updateUser(@Session() session?: UserSession) {
		return implement(v1.rbac.users.update).handler(async ({ input }) => {
			return this.rbacAdminService.updateUser(input, session?.user?.id ?? null)
		})
	}

	// Soft deactivate/reactivate is the closest analogue to deletion for a user
	// account (the record + credentials are retained), so it is gated by users:delete.
	@RequirePermissions("users:delete")
	@Implement(v1.rbac.users.setActive)
	async setUserActive(@Session() session?: UserSession) {
		return implement(v1.rbac.users.setActive).handler(async ({ input }) => {
			return this.rbacAdminService.setUserActive(input, session?.user?.id ?? null)
		})
	}

	@RequirePermissions("users:manage")
	@Implement(v1.rbac.users.assignRole)
	async assignRole(@Session() session?: UserSession) {
		return implement(v1.rbac.users.assignRole).handler(async ({ input }) => {
			return this.rbacAdminService.assignUserRole(input, session?.user?.id ?? null)
		})
	}

	@RequirePermissions("users:manage")
	@Implement(v1.rbac.users.removeRole)
	async removeRole(@Session() session?: UserSession) {
		return implement(v1.rbac.users.removeRole).handler(async ({ input }) => {
			return this.rbacAdminService.removeUserRole(input, session?.user?.id ?? null)
		})
	}

	@RequirePermissions("users:manage")
	@Implement(v1.rbac.users.assignDivision)
	async assignDivision(@Session() session?: UserSession) {
		return implement(v1.rbac.users.assignDivision).handler(async ({ input }) => {
			return this.rbacAdminService.assignUserDivision(input, session?.user?.id ?? null)
		})
	}
}
