import { z } from "zod"

import { PermissionNameSchema } from "./rbac.catalog.js"

// ============================================================================
// SHARED
// ============================================================================
const dateField = z
	.union([z.date(), z.string()])
	.transform(val => (typeof val === "string" ? new Date(val) : val))

const RoleIdParamSchema = z.object({
	id: z.coerce.number().int().positive(),
})

// ============================================================================
// ROLES
// ============================================================================
export const RoleSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1),
	description: z.string().nullable(),
	permissions: z.array(PermissionNameSchema),
	userCount: z.number().int().nonnegative(),
	createdAt: dateField,
	updatedAt: dateField,
})

export const CreateRoleSchema = z.object({
	name: z.string().min(1, "Name is required").max(100, "Name too long"),
	description: z.string().max(255, "Description too long").optional(),
	/**
	 * Optional initial permission set from the static catalog. When provided,
	 * these permissions are granted to the role on creation; omit to create a
	 * role with no permissions and assign them later via setPermissions.
	 */
	permissions: z.array(PermissionNameSchema).optional(),
})

/** Update route input: id from path + optional name/description/permissions */
export const UpdateRoleRequestSchema = RoleIdParamSchema.extend({
	name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
	description: z.string().max(255, "Description too long").nullable().optional(),
	/**
	 * Optional full replacement of the role's permission set from the static
	 * catalog. When provided, the role's permissions are replaced wholesale
	 * (same semantics as setPermissions); omit to leave permissions untouched.
	 */
	permissions: z.array(PermissionNameSchema).optional(),
})

/** Set-permissions route input: id from path + full permission list */
export const SetRolePermissionsRequestSchema = RoleIdParamSchema.extend({
	permissions: z.array(PermissionNameSchema),
})

export const RoleIdSchema = RoleIdParamSchema

export const DeleteRoleResponseSchema = z.object({
	success: z.boolean(),
	id: z.number().int().positive(),
})

// ============================================================================
// PERMISSIONS (read-only catalog)
// ============================================================================
export const PermissionSchema = z.object({
	name: PermissionNameSchema,
	description: z.string().nullable(),
	/** Top-level grouping for matrix display (e.g. "Administration"). */
	module: z.string().nullable(),
	/** Second-level grouping (e.g. "Divisions"). */
	subModule: z.string().nullable(),
	/** The resource token (left of `:`). */
	resource: z.string().nullable(),
	/** The action token (right of `:`), or `*` for the resource wildcard. */
	action: z.string().nullable(),
	/** True when this entry is the `resource:*` wildcard. */
	isWildcard: z.boolean(),
})

// ============================================================================
// USERS
// ============================================================================
export const UserWithRolesSchema = z.object({
	id: z.string(),
	name: z.string().nullable(),
	email: z.string(),
	roles: z.array(z.string()),
	/**
	 * Account active flag. Deactivated users (false) are denied normal protected
	 * access by the backend RbacGuard while their record/credentials are retained.
	 */
	isActive: z.boolean(),
	/**
	 * Division the user is scoped to. A null divisionId is only unrestricted for
	 * Admin / global principals; non-admin users without a division fail closed
	 * under DivisionScopeService (no division-scoped access).
	 */
	divisionId: z.number().int().positive().nullable(),
	/** Resolved division name for display; null when no division assigned. */
	divisionName: z.string().nullable(),
})

// ----------------------------------------------------------------------------
// ADMIN USER MANAGEMENT (create / update / activate)
// ----------------------------------------------------------------------------

/**
 * Create-user route input.
 *
 * Credential creation is Better Auth compatible: the backend stores a
 * `credential` account whose password uses Better Auth's default scrypt
 * `salt:hash` format (the same format the seed produces), so the new user can
 * sign in via email/password immediately.
 *
 * `password` is optional. When omitted, the backend generates a random
 * temporary credential (invite-style); delivering/resetting it is handled
 * out-of-band (notifications / T9) and the plaintext is never returned.
 */
export const CreateUserSchema = z.object({
	name: z.string().min(1, "Name is required").max(255, "Name too long"),
	email: z.string().email("Invalid email").max(255, "Email too long"),
	password: z.string().min(8, "Password too short").max(128, "Password too long").optional(),
	/** Optional role names (from the roles table) to grant on creation. */
	roleNames: z.array(z.string().min(1)).optional(),
	/**
	 * Optional division scope. null / omitted = global (only unrestricted for
	 * Admin principals; non-admins without a division fail closed downstream).
	 */
	divisionId: z.number().int().positive().nullable().optional(),
})

/** Update-user route input: userId from path + optional profile fields. */
export const UpdateUserRequestSchema = z.object({
	userId: z.string().min(1),
	name: z.string().min(1, "Name is required").max(255, "Name too long").optional(),
	email: z.string().email("Invalid email").max(255, "Email too long").optional(),
})

/** Set-active route input: userId from path + active flag from body. */
export const SetUserActiveRequestSchema = z.object({
	userId: z.string().min(1),
	isActive: z.boolean(),
})

/** Assign-division route input: userId from path + nullable divisionId from body. */
export const AssignUserDivisionRequestSchema = z.object({
	userId: z.string().min(1),
	divisionId: z.number().int().positive().nullable(),
})

export const AssignUserDivisionResponseSchema = z.object({
	success: z.boolean(),
	userId: z.string(),
	divisionId: z.number().int().positive().nullable(),
})

/** Assign route input: userId from path + roleName from body */
export const AssignRoleRequestSchema = z.object({
	userId: z.string().min(1),
	roleName: z.string().min(1),
})

/** Remove route input: userId + roleName, both from path */
export const RemoveRoleRequestSchema = z.object({
	userId: z.string().min(1),
	roleName: z.string().min(1),
})

export const UserRoleMutationResponseSchema = z.object({
	success: z.boolean(),
	userId: z.string(),
	roleName: z.string(),
})

// ============================================================================
// TYPES
// ============================================================================
export type Role = z.infer<typeof RoleSchema>
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>
export type UpdateRoleRequest = z.infer<typeof UpdateRoleRequestSchema>
export type SetRolePermissionsRequest = z.infer<typeof SetRolePermissionsRequestSchema>
export type PermissionCatalogEntry = z.infer<typeof PermissionSchema>
export type UserWithRoles = z.infer<typeof UserWithRolesSchema>
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>
export type SetUserActiveRequest = z.infer<typeof SetUserActiveRequestSchema>
export type AssignRoleRequest = z.infer<typeof AssignRoleRequestSchema>
export type RemoveRoleRequest = z.infer<typeof RemoveRoleRequestSchema>
export type AssignUserDivisionRequest = z.infer<typeof AssignUserDivisionRequestSchema>
export type AssignUserDivisionResponse = z.infer<typeof AssignUserDivisionResponseSchema>
