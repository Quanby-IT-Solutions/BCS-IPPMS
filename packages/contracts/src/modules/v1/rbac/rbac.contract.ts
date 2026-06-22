import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AssignRoleRequestSchema,
	AssignUserDivisionRequestSchema,
	AssignUserDivisionResponseSchema,
	CreateRoleSchema,
	CreateUserSchema,
	DeleteRoleResponseSchema,
	PermissionSchema,
	RemoveRoleRequestSchema,
	RoleIdSchema,
	RoleSchema,
	SetRolePermissionsRequestSchema,
	SetUserActiveRequestSchema,
	UpdateRoleRequestSchema,
	UpdateUserRequestSchema,
	UserRoleMutationResponseSchema,
	UserWithRolesSchema,
} from "./rbac.schema.js"

/**
 * RBAC administration contract.
 *
 * Role/permission endpoints require the granular `roles:*` / `permissions:*`
 * catalog permissions; user-management endpoints require `users:read` /
 * `users:manage` (all enforced by the backend RbacGuard). Permissions are a
 * fixed catalog; this surface assigns existing catalog permissions to roles, it
 * does not mint new permissions.
 */
export const rbacContract = {
	roles: {
		list: oc
			.route({
				method: "GET",
				path: "/rbac/roles",
				summary: "List roles",
				description: "List all roles with their assigned permissions and user counts.",
				tags: ["RBAC"],
			})
			.output(z.array(RoleSchema)),

		create: oc
			.route({
				method: "POST",
				path: "/rbac/roles",
				summary: "Create role",
				description: "Create a new role.",
				tags: ["RBAC"],
			})
			.input(CreateRoleSchema)
			.output(RoleSchema),

		update: oc
			.route({
				method: "PUT",
				path: "/rbac/roles/{id}",
				summary: "Update role",
				description: "Update a role's name or description.",
				tags: ["RBAC"],
			})
			.input(UpdateRoleRequestSchema)
			.output(RoleSchema),

		setPermissions: oc
			.route({
				method: "PUT",
				path: "/rbac/roles/{id}/permissions",
				summary: "Set role permissions",
				description: "Replace the full set of permissions granted to a role.",
				tags: ["RBAC"],
			})
			.input(SetRolePermissionsRequestSchema)
			.output(RoleSchema),

		delete: oc
			.route({
				method: "DELETE",
				path: "/rbac/roles/{id}",
				summary: "Delete role",
				description: "Delete a role.",
				tags: ["RBAC"],
			})
			.input(RoleIdSchema)
			.output(DeleteRoleResponseSchema),
	},

	permissions: {
		list: oc
			.route({
				method: "GET",
				path: "/rbac/permissions",
				summary: "List permissions",
				description: "List the permission catalog.",
				tags: ["RBAC"],
			})
			.output(z.array(PermissionSchema)),
	},

	users: {
		list: oc
			.route({
				method: "GET",
				path: "/rbac/users",
				summary: "List users",
				description:
					"List all users with their assigned role names, division, and active status.",
				tags: ["RBAC"],
			})
			.output(z.array(UserWithRolesSchema)),

		create: oc
			.route({
				method: "POST",
				path: "/rbac/users",
				summary: "Create user",
				description:
					"Create a user with a Better Auth credential account, optionally granting roles and a division. Requires `users:create`.",
				tags: ["RBAC"],
			})
			.input(CreateUserSchema)
			.output(UserWithRolesSchema),

		update: oc
			.route({
				method: "PUT",
				path: "/rbac/users/{userId}",
				summary: "Update user profile",
				description: "Update a user's name and/or email. Requires `users:update`.",
				tags: ["RBAC"],
			})
			.input(UpdateUserRequestSchema)
			.output(UserWithRolesSchema),

		setActive: oc
			.route({
				method: "PUT",
				path: "/rbac/users/{userId}/active",
				summary: "Activate or deactivate user",
				description:
					"Set a user's active flag. Deactivated users are denied normal protected access by the RbacGuard; reactivation restores it. Requires `users:delete`.",
				tags: ["RBAC"],
			})
			.input(SetUserActiveRequestSchema)
			.output(UserWithRolesSchema),

		assignRole: oc
			.route({
				method: "POST",
				path: "/rbac/users/{userId}/roles",
				summary: "Assign role to user",
				description: "Assign a role to a user by role name.",
				tags: ["RBAC"],
			})
			.input(AssignRoleRequestSchema)
			.output(UserRoleMutationResponseSchema),

		removeRole: oc
			.route({
				method: "DELETE",
				path: "/rbac/users/{userId}/roles/{roleName}",
				summary: "Remove role from user",
				description: "Remove a role from a user by role name.",
				tags: ["RBAC"],
			})
			.input(RemoveRoleRequestSchema)
			.output(UserRoleMutationResponseSchema),

		assignDivision: oc
			.route({
				method: "PUT",
				path: "/rbac/users/{userId}/division",
				summary: "Assign user division",
				description:
					"Set or clear a user's division scope. Clearing it (null divisionId) is only unrestricted for Admin / global principals; non-admin users without a division fail closed under DivisionScopeService.",
				tags: ["RBAC"],
			})
			.input(AssignUserDivisionRequestSchema)
			.output(AssignUserDivisionResponseSchema),
	},
}
