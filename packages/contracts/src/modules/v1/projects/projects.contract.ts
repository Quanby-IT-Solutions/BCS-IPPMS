import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AssignTaskRequestSchema,
	ClosureProjectIdSchema,
	CreateMilestoneSchema,
	CreateProjectSchema,
	CreateTaskSchema,
	DeleteMilestoneResponseSchema,
	DeleteTaskResponseSchema,
	ListMilestonesQuerySchema,
	ListProjectsQuerySchema,
	ListTasksQuerySchema,
	MilestoneIdSchema,
	ProjectApprovalStatusSchema,
	ProjectClosureSchema,
	ProjectIdSchema,
	ProjectMilestoneSchema,
	ProjectSchema,
	ProjectTaskSchema,
	SetMilestoneProgressRequestSchema,
	SetMilestoneStatusRequestSchema,
	SetTaskStatusRequestSchema,
	SubmitClosureSchema,
	TaskIdSchema,
	UpdateMilestoneRequestSchema,
	UpdateProjectRequestSchema,
	UpdateTaskRequestSchema,
} from "./projects.schema.js"

/**
 * Project lifecycle contract — proposal/conceptualization, schedule
 * (milestones), task delegation, execution/progress, and closure.
 *
 * All endpoints are division-scoped server-side (Admin sees all; a scoped user
 * sees only their own division; a non-admin without a division is fail-closed).
 * Reads require the matching `*:read` permission; writes require the granular
 * action permission (or the `resource:*` wildcard, or the Admin super-role),
 * enforced by the backend RbacGuard. Submit additionally routes the proposal
 * through the approval engine and blocks when no chain exists for the division.
 */
export const projectsContract = {
	// ---- Projects ----------------------------------------------------------
	list: oc
		.route({
			method: "GET",
			path: "/projects",
			summary: "List projects",
			description: "List division-scoped projects, optionally filtered by status.",
			tags: ["Projects"],
		})
		.input(ListProjectsQuerySchema)
		.output(z.array(ProjectSchema)),

	get: oc
		.route({
			method: "GET",
			path: "/projects/{id}",
			summary: "Get project",
			description: "Get a single project by id (division-scoped).",
			tags: ["Projects"],
		})
		.input(ProjectIdSchema)
		.output(ProjectSchema),

	create: oc
		.route({
			method: "POST",
			path: "/projects",
			summary: "Create project",
			description: "Create a draft project with conceptualization fields.",
			tags: ["Projects"],
		})
		.input(CreateProjectSchema)
		.output(ProjectSchema),

	update: oc
		.route({
			method: "PUT",
			path: "/projects/{id}",
			summary: "Update project",
			description: "Update conceptualization fields on a non-closed project.",
			tags: ["Projects"],
		})
		.input(UpdateProjectRequestSchema)
		.output(ProjectSchema),

	submit: oc
		.route({
			method: "POST",
			path: "/projects/{id}/submit",
			summary: "Submit project proposal",
			description:
				"Submit a draft project into its division's approval chain. Sets status to In Approval. Blocked when no active chain exists.",
			tags: ["Projects"],
		})
		.input(ProjectIdSchema)
		.output(ProjectSchema),

	activate: oc
		.route({
			method: "POST",
			path: "/projects/{id}/activate",
			summary: "Activate project",
			description:
				"Transition an In Approval project to Active (manual transition pending an approval-completion callback).",
			tags: ["Projects"],
		})
		.input(ProjectIdSchema)
		.output(ProjectSchema),

	approval: {
		get: oc
			.route({
				method: "GET",
				path: "/projects/{id}/approval",
				summary: "Get project approval status",
				description:
					"Read-only approval status tracker for the project's latest proposal request (null when none).",
				tags: ["Projects"],
			})
			.input(ProjectIdSchema)
			.output(ProjectApprovalStatusSchema),
	},

	// ---- Tasks (delegation + global board) --------------------------------
	tasks: {
		list: oc
			.route({
				method: "GET",
				path: "/project-tasks",
				summary: "List project tasks",
				description:
					"List tasks for a project, or the division-scoped global board when no projectId is given.",
				tags: ["Projects"],
			})
			.input(ListTasksQuerySchema)
			.output(z.array(ProjectTaskSchema)),

		get: oc
			.route({
				method: "GET",
				path: "/project-tasks/{id}",
				summary: "Get project task",
				description: "Get a single task by id (division-scoped).",
				tags: ["Projects"],
			})
			.input(TaskIdSchema)
			.output(ProjectTaskSchema),

		create: oc
			.route({
				method: "POST",
				path: "/project-tasks",
				summary: "Create project task",
				description: "Create a task under a project and optionally assign it.",
				tags: ["Projects"],
			})
			.input(CreateTaskSchema)
			.output(ProjectTaskSchema),

		update: oc
			.route({
				method: "PUT",
				path: "/project-tasks/{id}",
				summary: "Update project task",
				description: "Update task fields.",
				tags: ["Projects"],
			})
			.input(UpdateTaskRequestSchema)
			.output(ProjectTaskSchema),

		delete: oc
			.route({
				method: "DELETE",
				path: "/project-tasks/{id}",
				summary: "Delete project task",
				description: "Delete a task.",
				tags: ["Projects"],
			})
			.input(TaskIdSchema)
			.output(DeleteTaskResponseSchema),

		assign: oc
			.route({
				method: "PATCH",
				path: "/project-tasks/{id}/assign",
				summary: "Assign project task",
				description: "Assign (or unassign) a task; notifies the new assignee.",
				tags: ["Projects"],
			})
			.input(AssignTaskRequestSchema)
			.output(ProjectTaskSchema),

		setStatus: oc
			.route({
				method: "PATCH",
				path: "/project-tasks/{id}/status",
				summary: "Set project task status",
				description: "Move a task across To Do / In Progress / Done.",
				tags: ["Projects"],
			})
			.input(SetTaskStatusRequestSchema)
			.output(ProjectTaskSchema),
	},

	// ---- Milestones (schedule + execution progress) -----------------------
	milestones: {
		list: oc
			.route({
				method: "GET",
				path: "/project-milestones",
				summary: "List project milestones",
				description: "List a project's milestones (division-scoped).",
				tags: ["Projects"],
			})
			.input(ListMilestonesQuerySchema)
			.output(z.array(ProjectMilestoneSchema)),

		create: oc
			.route({
				method: "POST",
				path: "/project-milestones",
				summary: "Create project milestone",
				description: "Create a milestone for a project.",
				tags: ["Projects"],
			})
			.input(CreateMilestoneSchema)
			.output(ProjectMilestoneSchema),

		update: oc
			.route({
				method: "PUT",
				path: "/project-milestones/{id}",
				summary: "Update project milestone",
				description: "Update milestone fields.",
				tags: ["Projects"],
			})
			.input(UpdateMilestoneRequestSchema)
			.output(ProjectMilestoneSchema),

		delete: oc
			.route({
				method: "DELETE",
				path: "/project-milestones/{id}",
				summary: "Delete project milestone",
				description: "Delete a milestone.",
				tags: ["Projects"],
			})
			.input(MilestoneIdSchema)
			.output(DeleteMilestoneResponseSchema),

		setStatus: oc
			.route({
				method: "PATCH",
				path: "/project-milestones/{id}/status",
				summary: "Set milestone status",
				description: "Update a milestone's status.",
				tags: ["Projects"],
			})
			.input(SetMilestoneStatusRequestSchema)
			.output(ProjectMilestoneSchema),

		setProgress: oc
			.route({
				method: "PATCH",
				path: "/project-milestones/{id}/progress",
				summary: "Set milestone progress",
				description: "Update a milestone's progress percentage (0-100).",
				tags: ["Projects"],
			})
			.input(SetMilestoneProgressRequestSchema)
			.output(ProjectMilestoneSchema),
	},

	// ---- Closure ----------------------------------------------------------
	closures: {
		submit: oc
			.route({
				method: "POST",
				path: "/project-closures",
				summary: "Submit project closure",
				description: "Close an active project: record evaluation metrics and set status to Closed.",
				tags: ["Projects"],
			})
			.input(SubmitClosureSchema)
			.output(ProjectClosureSchema),

		get: oc
			.route({
				method: "GET",
				path: "/project-closures/{projectId}",
				summary: "Get project closure",
				description: "Get the latest closure record for a project (division-scoped).",
				tags: ["Projects"],
			})
			.input(ClosureProjectIdSchema)
			.output(ProjectClosureSchema.nullable()),
	},
}
