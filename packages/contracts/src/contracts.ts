/**
 * Central contract registry
 * Re-exports version routers
 */

// V1 contracts (routers)
export { v1Contract } from "./modules/v1/v1.contract.js"
export type { V1Contract } from "./modules/v1/v1.contract.js"

// Example todos schemas + types
export {
	TodoSchema,
	CreateTodoSchema,
	UpdateTodoRequestSchema,
} from "./modules/v1/examples/todos/todos.schema.js"
export type {
	Todo,
	CreateTodoInput,
	UpdateTodoRequest,
} from "./modules/v1/examples/todos/todos.schema.js"

// Ticket schemas + inferred types (the web form is wired to these)
export {
	TicketSchema,
	CreateTicketSchema,
	TicketIdSchema,
	TicketPrioritySchema,
	TicketStatusSchema,
} from "./modules/v1/tickets/tickets.schema.js"
export type {
	Ticket,
	CreateTicketInput,
	TicketIdInput,
} from "./modules/v1/tickets/tickets.schema.js"

// RBAC catalog (shared constants, enums, types)
export * from "./modules/v1/rbac/rbac.catalog.js"

// RBAC administration contract + schemas
export { rbacContract } from "./modules/v1/rbac/rbac.contract.js"
export {
	RoleSchema,
	CreateRoleSchema,
	UpdateRoleRequestSchema,
	SetRolePermissionsRequestSchema,
	RoleIdSchema,
	DeleteRoleResponseSchema,
	PermissionSchema,
	UserWithRolesSchema,
	CreateUserSchema,
	UpdateUserRequestSchema,
	SetUserActiveRequestSchema,
	AssignRoleRequestSchema,
	RemoveRoleRequestSchema,
	UserRoleMutationResponseSchema,
	AssignUserDivisionRequestSchema,
	AssignUserDivisionResponseSchema,
	AuditOutcomeSchema,
	AuditLogEntrySchema,
	ListAuditLogRequestSchema,
	ListAuditLogResponseSchema,
} from "./modules/v1/rbac/rbac.schema.js"
export type {
	Role,
	CreateRoleInput,
	UpdateRoleRequest,
	SetRolePermissionsRequest,
	PermissionCatalogEntry,
	UserWithRoles,
	CreateUserInput,
	UpdateUserRequest,
	SetUserActiveRequest,
	AssignRoleRequest,
	RemoveRoleRequest,
	AssignUserDivisionRequest,
	AssignUserDivisionResponse,
	AuditOutcome,
	AuditLogEntry,
	ListAuditLogRequest,
	ListAuditLogResponse,
} from "./modules/v1/rbac/rbac.schema.js"

// Divisions administration contract + schemas
export { divisionsContract } from "./modules/v1/divisions/divisions.contract.js"
export {
	DivisionSchema,
	CreateDivisionSchema,
	UpdateDivisionRequestSchema,
	SetDivisionActiveRequestSchema,
	DivisionIdSchema,
} from "./modules/v1/divisions/divisions.schema.js"
export type {
	Division,
	CreateDivisionInput,
	UpdateDivisionRequest,
	SetDivisionActiveRequest,
} from "./modules/v1/divisions/divisions.schema.js"

// Current-user access schemas
export { meContract } from "./modules/v1/me/me.contract.js"
export { MePermissionsSchema } from "./modules/v1/me/me.schema.js"
export type { MePermissions } from "./modules/v1/me/me.schema.js"

// Files metadata contract + schemas
export { filesContract } from "./modules/v1/files/files.contract.js"
export {
	FileSchema,
	ListFilesQuerySchema,
	AttachFileRequestSchema,
	DeleteFileResponseSchema,
	FileIdSchema,
} from "./modules/v1/files/files.schema.js"
export type {
	FileMetadata,
	ListFilesQuery,
	AttachFileRequest,
	DeleteFileResponse,
} from "./modules/v1/files/files.schema.js"

// Notifications contract + schemas
export { notificationsContract } from "./modules/v1/notifications/notifications.contract.js"
export {
	NotificationSchema,
	ListNotificationsQuerySchema,
	UnreadCountResponseSchema,
	MarkAllReadResponseSchema,
	NotificationIdSchema,
} from "./modules/v1/notifications/notifications.schema.js"
export type {
	NotificationItem,
	ListNotificationsQuery,
	UnreadCountResponse,
	MarkAllReadResponse,
} from "./modules/v1/notifications/notifications.schema.js"

// Approvals (workflow builder + inbox) contract + schemas
export { approvalsContract } from "./modules/v1/approvals/approvals.contract.js"
export {
	ApprovalModuleSchema,
	ApprovalStatusSchema,
	ApprovalActionTypeSchema,
	ApprovalStepSchema,
	ApprovalWorkflowSummarySchema,
	ApprovalWorkflowDetailSchema,
	ListWorkflowsQuerySchema,
	CreateApprovalWorkflowSchema,
	UpdateApprovalWorkflowSchema,
	WorkflowIdSchema,
	DeleteWorkflowResponseSchema,
	ApprovalRequestSummarySchema,
	ApprovalActionRecordSchema,
	ApprovalRequestDetailSchema,
	RequestIdSchema,
	ActOnRequestSchema,
} from "./modules/v1/approvals/approvals.schema.js"
export type {
	ApprovalModule,
	ApprovalStatus,
	ApprovalActionType,
	ApprovalStep,
	ApprovalWorkflowSummary,
	ApprovalWorkflowDetail,
	ListWorkflowsQuery,
	CreateApprovalWorkflowInput,
	UpdateApprovalWorkflowInput,
	DeleteWorkflowResponse,
	ApprovalRequestSummary,
	ApprovalActionRecord,
	ApprovalRequestDetail,
	ActOnRequestInput,
} from "./modules/v1/approvals/approvals.schema.js"

// Project lifecycle contract + schemas
export { projectsContract } from "./modules/v1/projects/projects.contract.js"
export {
	ProjectStatusSchema,
	TaskStatusSchema,
	MilestoneStatusSchema,
	ProjectSchema,
	ListProjectsQuerySchema,
	CreateProjectSchema,
	UpdateProjectRequestSchema,
	ProjectIdSchema,
	ProjectApprovalStatusSchema,
	ProjectMilestoneSchema,
	ListMilestonesQuerySchema,
	CreateMilestoneSchema,
	UpdateMilestoneRequestSchema,
	SetMilestoneStatusRequestSchema,
	SetMilestoneProgressRequestSchema,
	MilestoneIdSchema,
	DeleteMilestoneResponseSchema,
	ProjectTaskSchema,
	ListTasksQuerySchema,
	CreateTaskSchema,
	UpdateTaskRequestSchema,
	AssignTaskRequestSchema,
	SetTaskStatusRequestSchema,
	TaskIdSchema,
	DeleteTaskResponseSchema,
	ProjectClosureSchema,
	SubmitClosureSchema,
	ClosureProjectIdSchema,
} from "./modules/v1/projects/projects.schema.js"
export type {
	ProjectStatus,
	TaskStatus,
	MilestoneStatus,
	Project,
	ListProjectsQuery,
	CreateProjectInput,
	UpdateProjectRequest,
	ProjectApprovalStatus,
	ProjectMilestone,
	ListMilestonesQuery,
	CreateMilestoneInput,
	UpdateMilestoneRequest,
	SetMilestoneStatusRequest,
	SetMilestoneProgressRequest,
	DeleteMilestoneResponse,
	ProjectTask,
	ListTasksQuery,
	CreateTaskInput,
	UpdateTaskRequest,
	AssignTaskRequest,
	SetTaskStatusRequest,
	DeleteTaskResponse,
	ProjectClosure,
	SubmitClosureInput,
} from "./modules/v1/projects/projects.schema.js"

// Reports contract + schemas
export { reportsContract } from "./modules/v1/reports/reports.contract.js"
export {
	ReportTypeSchema,
	ReportFormatSchema,
	ReportParamsSchema,
	ReportExportQuerySchema,
	ReportSummaryItemSchema,
	ReportFiltersSchema,
	ReportPreviewSchema,
} from "./modules/v1/reports/reports.schema.js"
export type {
	ReportType,
	ReportFormat,
	ReportParams,
	ReportExportQuery,
	ReportSummaryItem,
	ReportFilters,
	ReportPreview,
} from "./modules/v1/reports/reports.schema.js"

// Audit read/export contract + schemas
export { auditContract } from "./modules/v1/audit/audit.contract.js"
export {
	AuditLogSchema,
	ListAuditLogsQuerySchema,
	ListAuditLogsResponseSchema,
} from "./modules/v1/audit/audit.schema.js"
export type {
	AuditLog,
	ListAuditLogsQuery,
	ListAuditLogsResponse,
} from "./modules/v1/audit/audit.schema.js"

// Future versions:
// export { v2Contract, type V2Contract } from "./modules/v2/v2.contract.js"
// export const v2 = { ... }
// export type { Todo as V2Todo, ... } from "./modules/v2/..."
