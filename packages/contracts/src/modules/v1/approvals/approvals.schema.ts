import { z } from "zod"

// ============================================================================
// SHARED
// ============================================================================
const dateField = z
	.union([z.date(), z.string()])
	.transform(val => (typeof val === "string" ? new Date(val) : val))

const IdParamSchema = z.object({
	id: z.coerce.number().int().positive(),
})

/**
 * Approval-enabled modules. Mirrors the `module` column type on
 * `approvalWorkflows` in the T1 schema. Subjects are polymorphic
 * (`subjectType` + `subjectId`); `module` selects which workflow chain routes
 * them.
 */
export const ApprovalModuleSchema = z.enum(["projects", "job_orders"])

/** Lifecycle status of an approval request. */
export const ApprovalStatusSchema = z.enum(["pending", "approved", "rejected"])

/** Actions an eligible approver can take on a pending request. */
export const ApprovalActionTypeSchema = z.enum(["approve", "reject", "delegate", "escalate"])

// ============================================================================
// WORKFLOW BUILDER
// ============================================================================
/** A single ordered role step within a workflow chain. */
export const ApprovalStepSchema = z.object({
	id: z.number().int().positive(),
	workflowId: z.number().int().positive(),
	stepOrder: z.number().int().positive(),
	approverRoleId: z.number().int().positive(),
	approverRoleName: z.string().nullable(),
})

/** Workflow list item, keyed by module + division. */
export const ApprovalWorkflowSummarySchema = z.object({
	id: z.number().int().positive(),
	module: ApprovalModuleSchema,
	divisionId: z.number().int().positive(),
	divisionName: z.string().nullable(),
	isActive: z.boolean(),
	stepCount: z.number().int().nonnegative(),
	createdAt: dateField,
	updatedAt: dateField,
})

/** Workflow with its ordered steps expanded. */
export const ApprovalWorkflowDetailSchema = ApprovalWorkflowSummarySchema.extend({
	steps: z.array(ApprovalStepSchema),
})

/** A single role step in a create/update payload. */
const ApprovalStepInputSchema = z.object({
	approverRoleId: z.number().int().positive(),
})

export const ListWorkflowsQuerySchema = z.object({
	module: ApprovalModuleSchema.optional(),
	divisionId: z.coerce.number().int().positive().optional(),
})

export const CreateApprovalWorkflowSchema = z.object({
	module: ApprovalModuleSchema,
	divisionId: z.number().int().positive(),
	isActive: z.boolean().optional(),
	// Ordered chain; array index defines stepOrder (1-based). At least one step.
	steps: z.array(ApprovalStepInputSchema).min(1, "At least one approval step is required"),
})

/** Update route input: id from path + optional active toggle / replacement chain. */
export const UpdateApprovalWorkflowSchema = IdParamSchema.extend({
	isActive: z.boolean().optional(),
	// When provided, replaces the entire ordered chain.
	steps: z.array(ApprovalStepInputSchema).min(1, "At least one approval step is required").optional(),
})

export const WorkflowIdSchema = IdParamSchema

export const DeleteWorkflowResponseSchema = z.object({
	id: z.number().int().positive(),
	deleted: z.literal(true),
})

// ============================================================================
// REQUESTS — INBOX, DETAIL, STATUS TRACKER
// ============================================================================
/** Summary row for the "My Approvals" inbox and request lists. */
export const ApprovalRequestSummarySchema = z.object({
	id: z.number().int().positive(),
	module: ApprovalModuleSchema,
	subjectType: z.string(),
	subjectId: z.number().int().positive(),
	workflowId: z.number().int().positive(),
	divisionId: z.number().int().positive().nullable(),
	currentStepOrder: z.number().int().positive(),
	status: ApprovalStatusSchema,
	requestedBy: z.string(),
	// The role required to act on the current step (null once finalized).
	currentStepRoleId: z.number().int().positive().nullable(),
	currentStepRoleName: z.string().nullable(),
	createdAt: dateField,
	updatedAt: dateField,
})

/** A recorded action on a request — feeds the status tracker timeline. */
export const ApprovalActionRecordSchema = z.object({
	id: z.number().int().positive(),
	requestId: z.number().int().positive(),
	stepOrder: z.number().int().positive(),
	actorId: z.string(),
	action: ApprovalActionTypeSchema,
	delegateToUserId: z.string().nullable(),
	note: z.string().nullable(),
	createdAt: dateField,
})

/** Full request detail: summary + ordered chain + action history. */
export const ApprovalRequestDetailSchema = ApprovalRequestSummarySchema.extend({
	steps: z.array(ApprovalStepSchema),
	actions: z.array(ApprovalActionRecordSchema),
})

export const RequestIdSchema = IdParamSchema

/**
 * Action input. `reject` and `escalate` require an explanatory `note`;
 * `delegate` requires `delegateToUserId`. Enforced via superRefine so the
 * client and the backend share one validation source.
 */
export const ActOnRequestSchema = IdParamSchema.extend({
	action: ApprovalActionTypeSchema,
	note: z.string().max(2000, "Note too long").optional(),
	delegateToUserId: z.string().optional(),
}).superRefine((val, ctx) => {
	if ((val.action === "reject" || val.action === "escalate") && !val.note?.trim()) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["note"],
			message: `A note is required when you ${val.action} a request`,
		})
	}
	if (val.action === "delegate" && !val.delegateToUserId?.trim()) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["delegateToUserId"],
			message: "A delegate target user is required",
		})
	}
})

// ============================================================================
// TYPES
// ============================================================================
export type ApprovalModule = z.infer<typeof ApprovalModuleSchema>
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>
export type ApprovalActionType = z.infer<typeof ApprovalActionTypeSchema>
export type ApprovalStep = z.infer<typeof ApprovalStepSchema>
export type ApprovalWorkflowSummary = z.infer<typeof ApprovalWorkflowSummarySchema>
export type ApprovalWorkflowDetail = z.infer<typeof ApprovalWorkflowDetailSchema>
export type ListWorkflowsQuery = z.infer<typeof ListWorkflowsQuerySchema>
export type CreateApprovalWorkflowInput = z.infer<typeof CreateApprovalWorkflowSchema>
export type UpdateApprovalWorkflowInput = z.infer<typeof UpdateApprovalWorkflowSchema>
export type DeleteWorkflowResponse = z.infer<typeof DeleteWorkflowResponseSchema>
export type ApprovalRequestSummary = z.infer<typeof ApprovalRequestSummarySchema>
export type ApprovalActionRecord = z.infer<typeof ApprovalActionRecordSchema>
export type ApprovalRequestDetail = z.infer<typeof ApprovalRequestDetailSchema>
export type ActOnRequestInput = z.infer<typeof ActOnRequestSchema>
