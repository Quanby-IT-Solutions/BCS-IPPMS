import { z } from "zod"

/**
 * RBAC catalog
 *
 * Shared role and permission constants, Zod enums, inferred types, and the
 * static permission hierarchy metadata.
 *
 * Consumed by the backend RBAC guard, seed scripts, and the frontend.
 */

// ---------------------------------------------------------------------------
// Role names
// ---------------------------------------------------------------------------

/** Canonical role names. Order is significant for display only. */
export const ROLE_NAMES = ["Admin", "Manager", "User"] as const

/** Zod enum validating a role name. */
export const RoleNameSchema = z.enum(ROLE_NAMES)

/**
 * The super-role. The RBAC guard short-circuits and grants access when a
 * principal holds this role, regardless of the required permission.
 */
export const ADMIN_ROLE = "Admin" as const

/** A valid role name. */
export type RoleName = z.infer<typeof RoleNameSchema>

// ---------------------------------------------------------------------------
// Permission catalog
// ---------------------------------------------------------------------------

/**
 * Permission naming convention: `resource:action`.
 *
 * - `resource` is the noun being protected (e.g. `posts`, `users`,
 *   `approval-workflows`). Hyphenated resources are allowed and treated as a
 *   single token; the guard splits only on the first `:`.
 * - `action` is the verb performed on it (e.g. `read`, `create`).
 *
 * Wildcard semantics: `resource:*` grants all actions on that resource.
 * When checking a required permission `resource:<action>`, the guard treats a
 * granted `resource:*` as a match for any action on that resource. Example:
 * holding `posts:*` satisfies a required `posts:read`, `posts:create`,
 * `posts:edit`, or `posts:delete`.
 *
 * Fail-closed: any name NOT in this catalog is denied by the guard, even if a
 * role somehow references it.
 */
export const PERMISSION_NAMES = [
	// ---- Example domain (preserved) ----------------------------------------
	// Granular post actions
	"posts:read",
	"posts:create",
	"posts:edit",
	"posts:delete",
	// Wildcard: grants all actions on the `posts` resource (resource:* convention)
	"posts:*",

	// ---- IPPMS: Administration ----------------------------------------------
	// Divisions
	"divisions:read",
	"divisions:create",
	"divisions:update",
	"divisions:delete",
	"divisions:*",
	// Users (users:read / users:manage preserved from the original catalog)
	"users:read",
	// Directory PII is split from `users:read`.
	//
	// `users:read` grants operational reads — the user list with names and
	// roles, and support-ticket triage. It used to also yield every
	// email address, so granting someone ticket triage handed them the complete
	// email directory as a side effect.
	//
	// Note the naming: `users:read-directory` is deliberately NOT
	// `users:directory-read`, because the wildcard convention matches on the
	// segment before the colon. A `users:*` holder still gets it, which is
	// intended — that wildcard means "everything about users".
	"users:read-directory",
	"users:create",
	"users:update",
	"users:delete",
	"users:manage",
	"users:*",
	// Roles
	"roles:read",
	"roles:create",
	"roles:update",
	"roles:delete",
	"roles:*",
	// Permissions
	"permissions:read",
	"permissions:assign",
	"permissions:*",
	// Security settings
	"security:read",
	"security:manage",
	"security:*",
	// API management
	"api:read",
	"api:manage",
	"api:*",

	// ---- IPPMS: Audit & Compliance -----------------------------------------
	"audit:read",
	"audit:export",
	"audit:*",

	// ---- IPPMS: Reports -----------------------------------------------------
	"reports:read",
	"reports:generate",
	"reports:export",
	"reports:*",

	// ---- IPPMS: Files -------------------------------------------------------
	"files:read",
	"files:upload",
	"files:download",
	"files:delete",
	"files:*",

	// ---- IPPMS: Notifications ----------------------------------------------
	"notifications:read",
	"notifications:manage",
	"notifications:*",

	// ---- IPPMS: Approvals ---------------------------------------------------
	// Workflow builder
	"approval-workflows:read",
	"approval-workflows:create",
	"approval-workflows:update",
	"approval-workflows:delete",
	"approval-workflows:*",
	// Requests (inbox / submission)
	"approval-requests:read",
	"approval-requests:submit",
	"approval-requests:*",
	// Actions taken on a request
	"approval-actions:approve",
	"approval-actions:reject",
	"approval-actions:delegate",
	"approval-actions:escalate",
	"approval-actions:*",

	// ---- IPPMS: Projects ----------------------------------------------------
	"projects:read",
	"projects:create",
	"projects:update",
	"projects:delete",
	"projects:submit",
	"projects:close",
	"projects:*",
	// Project tasks
	"project-tasks:read",
	"project-tasks:create",
	"project-tasks:update",
	"project-tasks:delete",
	"project-tasks:assign",
	"project-tasks:*",
	// Project milestones
	"project-milestones:read",
	"project-milestones:create",
	"project-milestones:update",
	"project-milestones:delete",
	"project-milestones:*",
	// Project closures
	"project-closures:read",
	"project-closures:create",
	"project-closures:*",

	// ---- IPPMS: Shell modules (read-only stubs for now) --------------------
	"production:read",
	"production:*",
	"circulation:read",
	"circulation:*",
	"analytics:read",
	"analytics:*",
	"calendar:read",
	"calendar:*",] as const

/** Zod enum validating a permission name. */
export const PermissionNameSchema = z.enum(PERMISSION_NAMES)

/** A valid permission name. */
export type PermissionName = z.infer<typeof PermissionNameSchema>

// ---------------------------------------------------------------------------
// Permission hierarchy metadata
// ---------------------------------------------------------------------------

/**
 * Structured metadata for a single permission. Lets the UI render the
 * module → sub-module → action grouping without re-parsing names everywhere.
 * The canonical list of valid names remains {@link PERMISSION_NAMES}; this is
 * descriptive overlay only.
 */
export interface PermissionMeta {
	/** The `resource:action` permission name. */
	name: PermissionName
	/** Top-level grouping for navigation/matrix display (e.g. "Administration"). */
	module: string
	/** Second-level grouping (e.g. "Divisions"). */
	subModule: string
	/** The resource token (left of `:`). */
	resource: string
	/** The action token (right of `:`), or `*` for the resource wildcard. */
	action: string
	/** True when this entry is the `resource:*` wildcard. */
	isWildcard: boolean
	/** Human-readable label for display. */
	description: string
}

const capitalize = (value: string): string =>
	value.length === 0 ? value : `${value.charAt(0).toUpperCase()}${value.slice(1)}`

/** "approval-workflows" → "approval workflows" for descriptions. */
const humanizeResource = (resource: string): string => resource.replace(/-/g, " ")

const describe = (resource: string, action: string): string => {
	const noun = humanizeResource(resource)
	if (action === "*") return `All actions on ${noun}`
	return `${capitalize(action)} ${noun}`
}

const definePermissions = (
	module: string,
	subModule: string,
	resource: string,
	actions: readonly string[]
): PermissionMeta[] =>
	actions.map(action => ({
		// Cast is safe: every generated name is also listed in PERMISSION_NAMES.
		name: `${resource}:${action}` as PermissionName,
		module,
		subModule,
		resource,
		action,
		isWildcard: action === "*",
		description: describe(resource, action),
	}))

/**
 * Flat, ordered metadata for every permission in the catalog. The `name` of
 * each entry is type-checked against {@link PermissionName}, so a typo here
 * fails the build.
 */
export const PERMISSION_CATALOG: readonly PermissionMeta[] = [
	// Example domain (preserved)
	...definePermissions("Examples", "Posts", "posts", ["read", "create", "edit", "delete", "*"]),

	// Administration
	...definePermissions("Administration", "Divisions", "divisions", [
		"read",
		"create",
		"update",
		"delete",
		"*",
	]),
	...definePermissions("Administration", "Users", "users", [
		"read",
		// Email addresses are gated separately from the user list — see the note
		// on `users:read-directory` in PERMISSION_NAMES.
		"read-directory",
		"create",
		"update",
		"delete",
		"manage",
		"*",
	]),
	...definePermissions("Administration", "Roles", "roles", [
		"read",
		"create",
		"update",
		"delete",
		"*",
	]),
	...definePermissions("Administration", "Permissions", "permissions", ["read", "assign", "*"]),
	...definePermissions("Administration", "Security Settings", "security", ["read", "manage", "*"]),
	...definePermissions("Administration", "API Management", "api", ["read", "manage", "*"]),

	// Audit & Compliance
	...definePermissions("Audit & Compliance", "Audit Logs", "audit", ["read", "export", "*"]),

	// Reports
	...definePermissions("Reports", "Reports", "reports", ["read", "generate", "export", "*"]),

	// Files
	...definePermissions("Files", "Files", "files", [
		"read",
		"upload",
		"download",
		"delete",
		"*",
	]),

	// Notifications
	...definePermissions("Notifications", "Notifications", "notifications", ["read", "manage", "*"]),

	// Approvals
	...definePermissions("Approvals", "Workflows", "approval-workflows", [
		"read",
		"create",
		"update",
		"delete",
		"*",
	]),
	...definePermissions("Approvals", "Requests", "approval-requests", ["read", "submit", "*"]),
	...definePermissions("Approvals", "Actions", "approval-actions", [
		"approve",
		"reject",
		"delegate",
		"escalate",
		"*",
	]),

	// Projects
	...definePermissions("Projects", "Projects", "projects", [
		"read",
		"create",
		"update",
		"delete",
		"submit",
		"close",
		"*",
	]),
	...definePermissions("Projects", "Tasks", "project-tasks", [
		"read",
		"create",
		"update",
		"delete",
		"assign",
		"*",
	]),
	...definePermissions("Projects", "Milestones", "project-milestones", [
		"read",
		"create",
		"update",
		"delete",
		"*",
	]),
	...definePermissions("Projects", "Closures", "project-closures", ["read", "create", "*"]),

	// Shell modules (read-only stubs)
	...definePermissions("Production", "Production", "production", ["read", "*"]),
	...definePermissions("Circulation", "Circulation", "circulation", ["read", "*"]),
	...definePermissions("Analytics", "Analytics", "analytics", ["read", "*"]),
	...definePermissions("Calendar", "Calendar", "calendar", ["read", "*"]),
]

/** A single action leaf under a sub-module. */
export interface PermissionActionNode {
	name: PermissionName
	action: string
	isWildcard: boolean
	description: string
}

/** A sub-module groups the actions of one resource. */
export interface PermissionSubModuleNode {
	subModule: string
	resource: string
	actions: PermissionActionNode[]
}

/** A module groups related sub-modules for navigation/matrix rendering. */
export interface PermissionModuleNode {
	module: string
	subModules: PermissionSubModuleNode[]
}

/**
 * Build the module → sub-module → action tree from {@link PERMISSION_CATALOG}.
 * Insertion order from the flat catalog is preserved at every level so the UI
 * renders a stable, intentional ordering.
 */
export function getPermissionHierarchy(): PermissionModuleNode[] {
	const modules: PermissionModuleNode[] = []
	const moduleIndex = new Map<string, PermissionModuleNode>()
	const subModuleIndex = new Map<string, PermissionSubModuleNode>()

	for (const entry of PERMISSION_CATALOG) {
		let moduleNode = moduleIndex.get(entry.module)
		if (!moduleNode) {
			moduleNode = { module: entry.module, subModules: [] }
			moduleIndex.set(entry.module, moduleNode)
			modules.push(moduleNode)
		}

		const subKey = `${entry.module}::${entry.subModule}`
		let subNode = subModuleIndex.get(subKey)
		if (!subNode) {
			subNode = { subModule: entry.subModule, resource: entry.resource, actions: [] }
			subModuleIndex.set(subKey, subNode)
			moduleNode.subModules.push(subNode)
		}

		subNode.actions.push({
			name: entry.name,
			action: entry.action,
			isWildcard: entry.isWildcard,
			description: entry.description,
		})
	}

	return modules
}

/** Look up the metadata for a single permission name. */
export function getPermissionMeta(name: PermissionName): PermissionMeta | undefined {
	return PERMISSION_CATALOG.find(entry => entry.name === name)
}
