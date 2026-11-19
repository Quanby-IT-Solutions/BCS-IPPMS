import { z } from "zod"

import { ApprovalActionRecordSchema, ApprovalStepSchema } from "../approvals/approvals.schema.js"

// ============================================================================
// SHARED
// ============================================================================
const dateField = z
	.union([z.date(), z.string()])
	.transform(val => (typeof val === "string" ? new Date(val) : val))

/** Nullable date accepted on input (ISO string or Date), coerced to Date. */
const optionalDateInput = z
	.union([z.date(), z.string()])
	.transform(val => (typeof val === "string" ? new Date(val) : val))
	.nullable()
	.optional()

const ProjectIdParamSchema = z.object({
	id: z.coerce.number().int().positive(),
})

const ProjectIdRefSchema = z.object({
	projectId: z.coerce.number().int().positive(),
})

// ============================================================================
// PROJECT LIFECYCLE STATUS
// ============================================================================
/** Lifecycle status of a project. Mirrors the `status` column on `projects`. */
export const ProjectStatusSchema = z.enum(["draft", "in_approval", "active", "closed"])

/** Status of a project task (Kanban columns). */
export const TaskStatusSchema = z.enum(["todo", "in_progress", "done"])

/** Status of a project milestone. */
export const MilestoneStatusSchema = z.enum(["pending", "in_progress", "done"])

// ============================================================================
// PROJECT
// ============================================================================
export const ProjectSchema = z.object({
	id: z.number().int().positive(),
	title: z.string().min(1),
	divisionId: z.number().int().positive().nullable(),
	status: ProjectStatusSchema,
	objectives: z.string().nullable(),
	scope: z.string().nullable(),
	deliverables: z.string().nullable(),
	createdBy: z.string(),
	createdAt: dateField,
	updatedAt: dateField,
})

export const ListProjectsQuerySchema = z.object({
	status: ProjectStatusSchema.optional(),
	divisionId: z.coerce.number().int().positive().optional(),
})

export const CreateProjectSchema = z.object({
	title: z.string().min(1, "Title is required").max(255, "Title too long"),
	objectives: z.string().max(5000, "Objectives too long").nullable().optional(),
	scope: z.string().max(5000, "Scope too long").nullable().optional(),
	deliverables: z.string().max(5000, "Deliverables too long").nullable().optional(),
	// Optional for non-admins (defaults to the actor's division); admins may target
	// any division. Submitting later requires a non-null division with a chain.
	divisionId: z.number().int().positive().optional(),
})

/** Update route input: id from path + optional conceptualization fields. */
export const UpdateProjectRequestSchema = ProjectIdParamSchema.extend({
	title: z.string().min(1, "Title is required").max(255, "Title too long").optional(),
	objectives: z.string().max(5000, "Objectives too long").nullable().optional(),
	scope: z.string().max(5000, "Scope too long").nullable().optional(),
	deliverables: z.string().max(5000, "Deliverables too long").nullable().optional(),
	divisionId: z.number().int().positive().optional(),
})

export const ProjectIdSchema = ProjectIdParamSchema

// ============================================================================
// APPROVAL STATUS TRACKER (read-only, references approvals schemas)
// ============================================================================
/**
 * Read-only approval status tracker for a project's latest proposal request.
 * Reuses the approval engine's step/action shapes so the frontend can render
 * the same timeline as the approvals inbox. `null` when no request exists yet.
 */
export const ProjectApprovalStatusSchema = z
	.object({
		requestId: z.number().int().positive(),
		status: z.enum(["pending", "approved", "rejected"]),
		currentStepOrder: z.number().int().positive(),
		divisionId: z.number().int().positive().nullable(),
		requestedBy: z.string(),
		steps: z.array(ApprovalStepSchema),
		actions: z.array(ApprovalActionRecordSchema),
		createdAt: dateField,
		updatedAt: dateField,
	})
	.nullable()

// ============================================================================
// MILESTONES
// ============================================================================
export const ProjectMilestoneSchema = z.object({
	id: z.number().int().positive(),
	projectId: z.number().int().positive(),
	name: z.string().min(1),
	dueDate: dateField.nullable(),
	status: MilestoneStatusSchema,
	progress: z.number().int().min(0).max(100),
	createdAt: dateField,
	updatedAt: dateField,
})

export const ListMilestonesQuerySchema = ProjectIdRefSchema

export const CreateMilestoneSchema = z.object({
	projectId: z.number().int().positive(),
	name: z.string().min(1, "Name is required").max(255, "Name too long"),
	dueDate: optionalDateInput,
	status: MilestoneStatusSchema.optional(),
	progress: z.number().int().min(0).max(100).optional(),
})

export const UpdateMilestoneRequestSchema = ProjectIdParamSchema.extend({
	name: z.string().min(1, "Name is required").max(255, "Name too long").optional(),
	dueDate: optionalDateInput,
	status: MilestoneStatusSchema.optional(),
	progress: z.number().int().min(0).max(100).optional(),
})

export const SetMilestoneStatusRequestSchema = ProjectIdParamSchema.extend({
	status: MilestoneStatusSchema,
})

export const SetMilestoneProgressRequestSchema = ProjectIdParamSchema.extend({
	progress: z.number().int().min(0).max(100),
})

export const MilestoneIdSchema = ProjectIdParamSchema

export const DeleteMilestoneResponseSchema = z.object({
	id: z.number().int().positive(),
	deleted: z.literal(true),
})

// ============================================================================
// TASKS
// ============================================================================
export const ProjectTaskSchema = z.object({
	id: z.number().int().positive(),
	projectId: z.number().int().positive(),
	title: z.string().min(1),
	assigneeId: z.string().nullable(),
	dueDate: dateField.nullable(),
	status: TaskStatusSchema,
	requirements: z.string().nullable(),
	createdAt: dateField,
	updatedAt: dateField,
})

/**
 * Task list input. With `projectId` it lists a project's tasks; without, it
 * returns the division-scoped global board (optionally filtered by assignee /
 * status).
 */
export const ListTasksQuerySchema = z.object({
	projectId: z.coerce.number().int().positive().optional(),
	assigneeId: z.string().optional(),
	status: TaskStatusSchema.optional(),
})

export const CreateTaskSchema = z.object({
	projectId: z.number().int().positive(),
	title: z.string().min(1, "Title is required").max(255, "Title too long"),
	assigneeId: z.string().nullable().optional(),
	dueDate: optionalDateInput,
	requirements: z.string().max(5000, "Requirements too long").nullable().optional(),
	status: TaskStatusSchema.optional(),
})

export const UpdateTaskRequestSchema = ProjectIdParamSchema.extend({
	title: z.string().min(1, "Title is required").max(255, "Title too long").optional(),
	assigneeId: z.string().nullable().optional(),
	dueDate: optionalDateInput,
	requirements: z.string().max(5000, "Requirements too long").nullable().optional(),
	status: TaskStatusSchema.optional(),
})

export const AssignTaskRequestSchema = ProjectIdParamSchema.extend({
	// Null unassigns; a string assigns the task to that user.
	assigneeId: z.string().nullable(),
})

export const SetTaskStatusRequestSchema = ProjectIdParamSchema.extend({
	status: TaskStatusSchema,
})

export const TaskIdSchema = ProjectIdParamSchema

export const DeleteTaskResponseSchema = z.object({
	id: z.number().int().positive(),
	deleted: z.literal(true),
})

// ============================================================================
// CLOSURE
// ============================================================================
export const ProjectClosureSchema = z.object({
	id: z.number().int().positive(),
	projectId: z.number().int().positive(),
	outcomeSummary: z.string().nullable(),
	objectivesMet: z.boolean().nullable(),
	performanceRating: z.number().int().nullable(),
	lessonsLearned: z.string().nullable(),
	closedBy: z.string(),
	closedAt: dateField,
})

export const SubmitClosureSchema = z.object({
	projectId: z.number().int().positive(),
	outcomeSummary: z.string().max(5000, "Summary too long").nullable().optional(),
	objectivesMet: z.boolean().nullable().optional(),
	performanceRating: z.number().int().min(0).max(100).nullable().optional(),
	lessonsLearned: z.string().max(5000, "Lessons learned too long").nullable().optional(),
})

export const ClosureProjectIdSchema = ProjectIdRefSchema

// ============================================================================
// TYPES
// ============================================================================
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>
export type TaskStatus = z.infer<typeof TaskStatusSchema>
export type MilestoneStatus = z.infer<typeof MilestoneStatusSchema>
export type Project = z.infer<typeof ProjectSchema>
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>
export type ProjectApprovalStatus = z.infer<typeof ProjectApprovalStatusSchema>
export type ProjectMilestone = z.infer<typeof ProjectMilestoneSchema>
export type ListMilestonesQuery = z.infer<typeof ListMilestonesQuerySchema>
export type CreateMilestoneInput = z.infer<typeof CreateMilestoneSchema>
export type UpdateMilestoneRequest = z.infer<typeof UpdateMilestoneRequestSchema>
export type SetMilestoneStatusRequest = z.infer<typeof SetMilestoneStatusRequestSchema>
export type SetMilestoneProgressRequest = z.infer<typeof SetMilestoneProgressRequestSchema>
export type DeleteMilestoneResponse = z.infer<typeof DeleteMilestoneResponseSchema>
export type ProjectTask = z.infer<typeof ProjectTaskSchema>
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>
export type AssignTaskRequest = z.infer<typeof AssignTaskRequestSchema>
export type SetTaskStatusRequest = z.infer<typeof SetTaskStatusRequestSchema>
export type DeleteTaskResponse = z.infer<typeof DeleteTaskResponseSchema>
export type ProjectClosure = z.infer<typeof ProjectClosureSchema>
export type SubmitClosureInput = z.infer<typeof SubmitClosureSchema>
