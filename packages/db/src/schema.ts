import { defineRelations } from "drizzle-orm"
import { index, primaryKey, unique } from "drizzle-orm/pg-core"

import { createTable } from "./utils/table.js"

// ============================================================================
// BETTER AUTH TABLES
// ============================================================================

export const users = createTable("users", t => ({
	id: t.text("id").primaryKey(),
	name: t.text("name").notNull(),
	email: t.text("email").notNull().unique(),
	emailVerified: t.boolean("email_verified").default(false).notNull(),
	image: t.text("image"),
	// Account active flag. Deactivated users (isActive = false) are denied normal
	// protected access by the RbacGuard while their record/credentials are retained
	// (soft deactivation, not deletion). Defaults true so existing rows stay active.
	isActive: t.boolean("is_active").notNull().default(true),
	// Division scope: null = global / Admin (no single-division restriction).
	divisionId: t.integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
	createdAt: t.timestamp("created_at").notNull().defaultNow(),
	updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
}))

export const sessions = createTable("sessions", t => ({
	id: t.text("id").primaryKey(),
	token: t.text("token").notNull().unique(),
	userId: t
		.text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresAt: t.timestamp("expires_at").notNull(),
	ipAddress: t.text("ip_address"),
	userAgent: t.text("user_agent"),
	createdAt: t.timestamp("created_at").notNull().defaultNow(),
	updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
}))

export const accounts = createTable(
	"accounts",
	t => ({
		id: t.text("id"),
		accountId: t.text("account_id").notNull(),
		providerId: t.text("provider_id").notNull(),
		userId: t
			.text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accessToken: t.text("access_token"),
		refreshToken: t.text("refresh_token"),
		idToken: t.text("id_token"),
		accessTokenExpiresAt: t.timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: t.timestamp("refresh_token_expires_at"),
		scope: t.text("scope"),
		password: t.text("password"), // For email/password auth
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		// Composite primary key on provider and account
		primaryKey({ columns: [t.providerId, t.accountId] }),
		index("account_user_id_idx").on(t.userId),
	]
)

export const verifications = createTable(
	"verifications",
	t => ({
		id: t.text("id"),
		identifier: t.text("identifier").notNull(),
		value: t.text("value").notNull(),
		expiresAt: t.timestamp("expires_at").notNull(),
		createdAt: t.timestamp("created_at").defaultNow(),
		updatedAt: t.timestamp("updated_at").defaultNow(),
	}),
	t => [
		// Composite primary key on identifier and value
		primaryKey({ columns: [t.identifier, t.value] }),
		// Rows here are short-lived tokens, but nothing deleted them,
		// so the table only ever grew — every unverified signup and every password
		// reset, kept forever. The sweeper deletes by expiry; without this index it
		// seq-scans a table whose whole problem is that it is large.
		index("verifications_expires_at_idx").on(t.expiresAt),
	]
)

// ============================================================================
// TODOs
// ============================================================================

export const todos = createTable("todos", t => ({
	id: t.serial("id").primaryKey(),
	title: t.text("title").notNull(),
	completed: t.boolean("completed").notNull().default(false),
	authorId: t
		.text("author_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	createdAt: t.timestamp("created_at").notNull().defaultNow(),
	updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
}))

// ============================================================================
// TICKETS
// ============================================================================

export const tickets = createTable("tickets", t => ({
	id: t.serial("id").primaryKey(),
	name: t.text("name").notNull(),
	email: t.text("email").notNull(),
	subject: t.text("subject").notNull(),
	priority: t
		.text("priority")
		.notNull()
		.default("medium")
		.$type<"low" | "medium" | "high" | "urgent">(),
	concern: t.text("concern").notNull(),
	status: t
		.text("status")
		.notNull()
		.default("received")
		.$type<"received" | "in_progress" | "resolved" | "closed">(),
	authorId: t.text("author_id").references(() => users.id, { onDelete: "set null" }),
	createdAt: t.timestamp("created_at").notNull().defaultNow(),
	updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
}))

// ============================================================================
// IDEMPOTENCY KEYS
// ============================================================================

/**
 * Replay cache for mutating requests.
 *
 * The primary key is composite on `(authorId, key)`. It used to be `key`
 * alone, which made the keyspace global: whoever sent a value first owned it,
 * so one user could squat another's key and the second user's request was
 * rejected as a duplicate — a denial-of-service against any client using
 * predictable keys. Idempotency is identity-scoped by design; two users
 * sending the same key are sending two unrelated requests.
 *
 * This is a cache, not a record. Rows expire and are swept.
 */
export const idempotencyKeys = createTable(
	"idempotency_keys",
	t => ({
		key: t.text("key").notNull(),
		authorId: t.text("author_id").notNull(),
		response: t.jsonb("response").notNull().$type<unknown>(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		/** When this row stops being a valid replay target. */
		expiresAt: t.timestamp("expires_at").notNull(),
	}),
	t => [
		primaryKey({ columns: [t.authorId, t.key] }),
		// The sweeper deletes by expiry; without this it seq-scans the table.
		index("idempotency_keys_expires_at_idx").on(t.expiresAt),
	]
)

// ============================================================================
// RBAC
// ============================================================================

export const roles = createTable("roles", t => ({
	id: t.serial("id").primaryKey(),
	name: t.text("name").notNull().unique(),
	description: t.text("description"),
	createdAt: t.timestamp("created_at").notNull().defaultNow(),
	updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
}))

export const permissions = createTable("permissions", t => ({
	id: t.serial("id").primaryKey(),
	name: t.text("name").notNull().unique(),
	description: t.text("description"),
	// Optional hierarchy metadata so a future matrix UI can group permissions.
	// Canonical permission list remains the static catalog in @repo/contracts.
	module: t.text("module"),
	subModule: t.text("sub_module"),
	action: t.text("action"),
	createdAt: t.timestamp("created_at").notNull().defaultNow(),
	updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
}))

export const userRoles = createTable(
	"user_roles",
	t => ({
		userId: t
			.text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		roleId: t
			.integer("role_id")
			.notNull()
			.references(() => roles.id, { onDelete: "cascade" }),
	}),
	t => [primaryKey({ columns: [t.userId, t.roleId] }), index("user_roles_user_id_idx").on(t.userId)]
)

export const rolePermissions = createTable(
	"role_permissions",
	t => ({
		roleId: t
			.integer("role_id")
			.notNull()
			.references(() => roles.id, { onDelete: "cascade" }),
		permissionId: t
			.integer("permission_id")
			.notNull()
			.references(() => permissions.id, { onDelete: "cascade" }),
	}),
	t => [primaryKey({ columns: [t.roleId, t.permissionId] })]
)

// ============================================================================
// DIVISIONS
// ============================================================================

export const divisions = createTable("divisions", t => ({
	id: t.serial("id").primaryKey(),
	name: t.text("name").notNull().unique(),
	description: t.text("description"),
	isActive: t.boolean("is_active").notNull().default(true),
	createdAt: t.timestamp("created_at").notNull().defaultNow(),
	updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
}))

// ============================================================================
// APPROVAL ENGINE (generic / polymorphic)
// ============================================================================

export const approvalWorkflows = createTable(
	"approval_workflows",
	t => ({
		id: t.serial("id").primaryKey(),
		module: t.text("module").notNull().$type<"projects" | "job_orders">(),
		// Workflow chains are scoped per division; submitting is blocked when no chain exists.
		divisionId: t
			.integer("division_id")
			.notNull()
			.references(() => divisions.id, { onDelete: "cascade" }),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [unique("approval_workflows_module_division_uq").on(t.module, t.divisionId)]
)

export const approvalSteps = createTable(
	"approval_steps",
	t => ({
		id: t.serial("id").primaryKey(),
		workflowId: t
			.integer("workflow_id")
			.notNull()
			.references(() => approvalWorkflows.id, { onDelete: "cascade" }),
		stepOrder: t.integer("step_order").notNull(),
		approverRoleId: t
			.integer("approver_role_id")
			.notNull()
			.references(() => roles.id, { onDelete: "cascade" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [index("approval_steps_workflow_id_idx").on(t.workflowId)]
)

export const approvalRequests = createTable(
	"approval_requests",
	t => ({
		id: t.serial("id").primaryKey(),
		// Polymorphic subject: subjectType identifies the entity kind, subjectId its row.
		subjectType: t.text("subject_type").notNull(),
		subjectId: t.integer("subject_id").notNull(),
		workflowId: t
			.integer("workflow_id")
			.notNull()
			.references(() => approvalWorkflows.id, { onDelete: "restrict" }),
		divisionId: t.integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
		currentStepOrder: t.integer("current_step_order").notNull().default(1),
		status: t
			.text("status")
			.notNull()
			.default("pending")
			.$type<"pending" | "approved" | "rejected">(),
		requestedBy: t
			.text("requested_by")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [index("approval_requests_subject_idx").on(t.subjectType, t.subjectId)]
)

export const approvalActions = createTable(
	"approval_actions",
	t => ({
		id: t.serial("id").primaryKey(),
		requestId: t
			.integer("request_id")
			.notNull()
			.references(() => approvalRequests.id, { onDelete: "cascade" }),
		stepOrder: t.integer("step_order").notNull(),
		actorId: t
			.text("actor_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		action: t.text("action").notNull().$type<"approve" | "reject" | "delegate" | "escalate">(),
		delegateToUserId: t
			.text("delegate_to_user_id")
			.references(() => users.id, { onDelete: "set null" }),
		note: t.text("note"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [index("approval_actions_request_id_idx").on(t.requestId)]
)

// ============================================================================
// PROJECT LIFECYCLE
// ============================================================================

export const projects = createTable("projects", t => ({
	id: t.serial("id").primaryKey(),
	title: t.text("title").notNull(),
	divisionId: t.integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
	status: t
		.text("status")
		.notNull()
		.default("draft")
		.$type<"draft" | "in_approval" | "active" | "closed">(),
	objectives: t.text("objectives"),
	scope: t.text("scope"),
	deliverables: t.text("deliverables"),
	createdBy: t
		.text("created_by")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	createdAt: t.timestamp("created_at").notNull().defaultNow(),
	updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
}))

export const projectMilestones = createTable(
	"project_milestones",
	t => ({
		id: t.serial("id").primaryKey(),
		projectId: t
			.integer("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		name: t.text("name").notNull(),
		dueDate: t.timestamp("due_date"),
		status: t
			.text("status")
			.notNull()
			.default("pending")
			.$type<"pending" | "in_progress" | "done">(),
		progress: t.integer("progress").notNull().default(0),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [index("project_milestones_project_id_idx").on(t.projectId)]
)

export const projectTasks = createTable(
	"project_tasks",
	t => ({
		id: t.serial("id").primaryKey(),
		projectId: t
			.integer("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		title: t.text("title").notNull(),
		assigneeId: t.text("assignee_id").references(() => users.id, { onDelete: "set null" }),
		dueDate: t.timestamp("due_date"),
		status: t.text("status").notNull().default("todo").$type<"todo" | "in_progress" | "done">(),
		requirements: t.text("requirements"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [index("project_tasks_project_id_idx").on(t.projectId)]
)

export const projectClosures = createTable("project_closures", t => ({
	id: t.serial("id").primaryKey(),
	projectId: t
		.integer("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	// Evaluation metrics captured at closure.
	outcomeSummary: t.text("outcome_summary"),
	objectivesMet: t.boolean("objectives_met"),
	performanceRating: t.integer("performance_rating"),
	lessonsLearned: t.text("lessons_learned"),
	closedBy: t
		.text("closed_by")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	closedAt: t.timestamp("closed_at").notNull().defaultNow(),
}))

// ============================================================================
// CROSS-CUTTING: FILES, AUDIT, NOTIFICATIONS
// ============================================================================

export const files = createTable(
	"files",
	t => ({
		id: t.serial("id").primaryKey(),
		storageKey: t.text("storage_key").notNull(),
		originalName: t.text("original_name").notNull(),
		mimeType: t.text("mime_type").notNull(),
		size: t.integer("size").notNull(),
		// Polymorphic owner: nullable until the file is attached to an entity.
		ownerType: t.text("owner_type"),
		ownerId: t.integer("owner_id"),
		uploadedBy: t
			.text("uploaded_by")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [index("files_owner_idx").on(t.ownerType, t.ownerId)]
)

/**
 * Append-only record of privileged actions.
 *
 * This is the single audit trail. The upstream template carried a second,
 * narrower `audit_log` table scoped to RBAC events; its stronger guarantees
 * were folded in here instead of running two trails, because "a complete
 * audit trail" is a contractual requirement and two tables cannot satisfy it
 * between them. What came across from upstream:
 *
 * - `outcome` — a refused attempt is evidence, so denials are recorded, not
 *   just successes.
 * - `oldValue` / `newValue` — what the state was and became.
 * - `reason` — why an attempt was refused.
 *
 * There is deliberately no `updatedAt`: a row that can be updated is not an
 * audit trail. The application exposes no UPDATE or DELETE path to this table.
 *
 * `actorId` is nullable and uses `set null` rather than `cascade`: deleting a
 * user must never erase the record of what they did.
 */
export const auditLogs = createTable(
	"audit_logs",
	t => ({
		id: t.serial("id").primaryKey(),
		actorId: t.text("actor_id").references(() => users.id, { onDelete: "set null" }),
		action: t.text("action").notNull(),
		module: t.text("module"),
		entityType: t.text("entity_type"),
		entityId: t.text("entity_id"),
		/** Whether the attempt succeeded or was refused. A denial is evidence. */
		outcome: t.text("outcome").notNull().default("success").$type<"success" | "denied">(),
		/** State before and after the action. Shape is per-action. */
		oldValue: t.jsonb("old_value").$type<unknown>(),
		newValue: t.jsonb("new_value").$type<unknown>(),
		/** Why the attempt was refused, for denials. */
		reason: t.text("reason"),
		metadata: t.jsonb("metadata").$type<Record<string, unknown>>(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("audit_logs_actor_id_idx").on(t.actorId),
		// The read endpoint is strictly reverse-chronological.
		index("audit_logs_created_at_idx").on(t.createdAt),
	]
)

export const notifications = createTable(
	"notifications",
	t => ({
		id: t.serial("id").primaryKey(),
		userId: t
			.text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: t.text("type").notNull(),
		title: t.text("title").notNull(),
		body: t.text("body"),
		linkPath: t.text("link_path"),
		isRead: t.boolean("is_read").notNull().default(false),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [index("notifications_user_id_idx").on(t.userId)]
)

// ============================================================================
// RELATIONS
// ============================================================================
export const relations = defineRelations(
	{
		users,
		sessions,
		accounts,
		todos,
		tickets,
		idempotencyKeys,
		roles,
		permissions,
		userRoles,
		rolePermissions,
		divisions,
		approvalWorkflows,
		approvalSteps,
		approvalRequests,
		approvalActions,
		projects,
		projectMilestones,
		projectTasks,
		projectClosures,
		files,
		auditLogs,
		notifications,
	},
	r => ({
		users: {
			sessions: r.many.sessions(),
			accounts: r.many.accounts(),
			userRoles: r.many.userRoles(),
			division: r.one.divisions({
				from: r.users.divisionId,
				to: r.divisions.id,
			}),
		},
		sessions: {
			user: r.one.users({
				from: r.sessions.userId,
				to: r.users.id,
			}),
		},
		accounts: {
			user: r.one.users({
				from: r.accounts.userId,
				to: r.users.id,
			}),
		},
		todos: {
			author: r.one.users({
				from: r.todos.authorId,
				to: r.users.id,
			}),
		},
		tickets: {
			author: r.one.users({
				from: r.tickets.authorId,
				to: r.users.id,
			}),
		},
		roles: {
			userRoles: r.many.userRoles(),
			rolePermissions: r.many.rolePermissions(),
		},
		permissions: {
			rolePermissions: r.many.rolePermissions(),
		},
		userRoles: {
			user: r.one.users({
				from: r.userRoles.userId,
				to: r.users.id,
			}),
			role: r.one.roles({
				from: r.userRoles.roleId,
				to: r.roles.id,
			}),
		},
		rolePermissions: {
			role: r.one.roles({
				from: r.rolePermissions.roleId,
				to: r.roles.id,
			}),
			permission: r.one.permissions({
				from: r.rolePermissions.permissionId,
				to: r.permissions.id,
			}),
		},
		divisions: {
			users: r.many.users(),
			approvalWorkflows: r.many.approvalWorkflows(),
			projects: r.many.projects(),
		},
		approvalWorkflows: {
			division: r.one.divisions({
				from: r.approvalWorkflows.divisionId,
				to: r.divisions.id,
			}),
			steps: r.many.approvalSteps(),
			requests: r.many.approvalRequests(),
		},
		approvalSteps: {
			workflow: r.one.approvalWorkflows({
				from: r.approvalSteps.workflowId,
				to: r.approvalWorkflows.id,
			}),
			approverRole: r.one.roles({
				from: r.approvalSteps.approverRoleId,
				to: r.roles.id,
			}),
		},
		approvalRequests: {
			workflow: r.one.approvalWorkflows({
				from: r.approvalRequests.workflowId,
				to: r.approvalWorkflows.id,
			}),
			division: r.one.divisions({
				from: r.approvalRequests.divisionId,
				to: r.divisions.id,
			}),
			requester: r.one.users({
				from: r.approvalRequests.requestedBy,
				to: r.users.id,
			}),
			actions: r.many.approvalActions(),
		},
		approvalActions: {
			request: r.one.approvalRequests({
				from: r.approvalActions.requestId,
				to: r.approvalRequests.id,
			}),
			actor: r.one.users({
				from: r.approvalActions.actorId,
				to: r.users.id,
			}),
			delegateTo: r.one.users({
				from: r.approvalActions.delegateToUserId,
				to: r.users.id,
			}),
		},
		projects: {
			division: r.one.divisions({
				from: r.projects.divisionId,
				to: r.divisions.id,
			}),
			creator: r.one.users({
				from: r.projects.createdBy,
				to: r.users.id,
			}),
			milestones: r.many.projectMilestones(),
			tasks: r.many.projectTasks(),
			closures: r.many.projectClosures(),
		},
		projectMilestones: {
			project: r.one.projects({
				from: r.projectMilestones.projectId,
				to: r.projects.id,
			}),
		},
		projectTasks: {
			project: r.one.projects({
				from: r.projectTasks.projectId,
				to: r.projects.id,
			}),
			assignee: r.one.users({
				from: r.projectTasks.assigneeId,
				to: r.users.id,
			}),
		},
		projectClosures: {
			project: r.one.projects({
				from: r.projectClosures.projectId,
				to: r.projects.id,
			}),
			closedByUser: r.one.users({
				from: r.projectClosures.closedBy,
				to: r.users.id,
			}),
		},
		files: {
			uploader: r.one.users({
				from: r.files.uploadedBy,
				to: r.users.id,
			}),
		},
		auditLogs: {
			actor: r.one.users({
				from: r.auditLogs.actorId,
				to: r.users.id,
			}),
		},
		notifications: {
			user: r.one.users({
				from: r.notifications.userId,
				to: r.users.id,
			}),
		},
	})
)

// ============================================================================
// SCHEMA
// ============================================================================
export const schema = Object.assign(
	{
		users,
		sessions,
		accounts,
		verifications,
		todos,
		tickets,
		idempotencyKeys,
		roles,
		permissions,
		userRoles,
		rolePermissions,
		divisions,
		approvalWorkflows,
		approvalSteps,
		approvalRequests,
		approvalActions,
		projects,
		projectMilestones,
		projectTasks,
		projectClosures,
		files,
		auditLogs,
		notifications,
	},
	relations
)
