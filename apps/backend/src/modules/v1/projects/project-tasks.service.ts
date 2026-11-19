import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { and, desc, eq } from "drizzle-orm"

import {
	type AssignTaskRequest,
	type CreateTaskInput,
	type DeleteTaskResponse,
	type ListTasksQuery,
	type ProjectTask,
	type SetTaskStatusRequest,
	type UpdateTaskRequest,
} from "@repo/contracts"
import { projects, projectTasks, users } from "@repo/db/schema"

import { AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"
import { DivisionScopeService } from "@/common/division-scope/division-scope.service"
import { NotificationsService } from "@/modules/v1/notifications/notifications.service"

import { ProjectsService } from "./projects.service"

/** Owning module label recorded on task audit events. */
const AUDIT_MODULE = "projects"

type TaskRow = typeof projectTasks.$inferSelect
type ProjectRow = typeof projects.$inferSelect

@Injectable()
export class ProjectTasksService {
	constructor(
		private readonly auditService: AuditService,
		private readonly divisionScope: DivisionScopeService,
		private readonly notificationsService: NotificationsService,
		private readonly projectsService: ProjectsService
	) {}

	// ==========================================================================
	// READ
	// ==========================================================================
	/**
	 * List tasks. With a `projectId` it returns that project's tasks (after a
	 * scope check); without one it returns the division-scoped global board by
	 * joining tasks to their projects and applying the division filter.
	 */
	async list(userId: string, query: ListTasksQuery): Promise<ProjectTask[]> {
		if (query.projectId !== undefined) {
			await this.projectsService.loadAccessible(userId, query.projectId)

			const conditions = [eq(projectTasks.projectId, query.projectId)]
			if (query.assigneeId) conditions.push(eq(projectTasks.assigneeId, query.assigneeId))
			if (query.status) conditions.push(eq(projectTasks.status, query.status))

			const rows = await db
				.select()
				.from(projectTasks)
				.where(and(...conditions))
				.orderBy(desc(projectTasks.createdAt))
			return rows.map(row => this.toTask(row))
		}

		// Global board: division-scoped across projects.
		const context = await this.divisionScope.resolveContext(userId)
		const conditions = []
		const scopeFilter = this.divisionScope.divisionFilter(context, projects.divisionId)
		if (scopeFilter) conditions.push(scopeFilter)
		if (query.assigneeId) conditions.push(eq(projectTasks.assigneeId, query.assigneeId))
		if (query.status) conditions.push(eq(projectTasks.status, query.status))

		const rows = await db
			.select({ task: projectTasks })
			.from(projectTasks)
			.innerJoin(projects, eq(projectTasks.projectId, projects.id))
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(desc(projectTasks.createdAt))

		return rows.map(row => this.toTask(row.task))
	}

	async get(userId: string, id: number): Promise<ProjectTask> {
		const { row } = await this.loadAccessibleTask(userId, id)
		return this.toTask(row)
	}

	// ==========================================================================
	// WRITE
	// ==========================================================================
	async create(userId: string, payload: CreateTaskInput): Promise<ProjectTask> {
		const { row: project } = await this.projectsService.loadAccessible(userId, payload.projectId)
		this.projectsService.assertMutable(project)

		if (payload.assigneeId) await this.assertUserExists(payload.assigneeId)

		const [row] = await db
			.insert(projectTasks)
			.values({
				projectId: payload.projectId,
				title: payload.title,
				assigneeId: payload.assigneeId ?? null,
				dueDate: payload.dueDate ?? null,
				status: payload.status ?? "todo",
				requirements: payload.requirements ?? null,
			})
			.returning()

		if (!row) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Task could not be created" })
		}

		await this.auditService.record({
			actorId: userId,
			action: "project.task.created",
			module: AUDIT_MODULE,
			entityType: "project_task",
			entityId: row.id,
			metadata: { projectId: row.projectId, assigneeId: row.assigneeId },
		})

		await this.notifyAssignment(row, userId)

		return this.toTask(row)
	}

	async update(userId: string, payload: UpdateTaskRequest): Promise<ProjectTask> {
		const { row, project } = await this.loadAccessibleTask(userId, payload.id)
		this.projectsService.assertMutable(project)

		const nextAssignee = payload.assigneeId !== undefined ? payload.assigneeId : row.assigneeId
		if (payload.assigneeId) await this.assertUserExists(payload.assigneeId)

		const [updated] = await db
			.update(projectTasks)
			.set({
				title: payload.title ?? row.title,
				assigneeId: nextAssignee,
				dueDate: payload.dueDate !== undefined ? payload.dueDate : row.dueDate,
				status: payload.status ?? row.status,
				requirements: payload.requirements !== undefined ? payload.requirements : row.requirements,
				updatedAt: new Date(),
			})
			.where(eq(projectTasks.id, row.id))
			.returning()

		if (!updated) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Task could not be updated" })
		}

		await this.auditService.record({
			actorId: userId,
			action: "project.task.updated",
			module: AUDIT_MODULE,
			entityType: "project_task",
			entityId: updated.id,
			metadata: { projectId: updated.projectId },
		})

		// Notify on assignee change and on status change for the assignee.
		const assigneeChanged = updated.assigneeId !== row.assigneeId
		if (assigneeChanged) {
			await this.notifyAssignment(updated, userId)
		} else if (payload.status && payload.status !== row.status) {
			await this.notifyStatusChange(updated, userId)
		}

		return this.toTask(updated)
	}

	async delete(userId: string, id: number): Promise<DeleteTaskResponse> {
		const { row, project } = await this.loadAccessibleTask(userId, id)
		this.projectsService.assertMutable(project)

		await db.delete(projectTasks).where(eq(projectTasks.id, row.id))

		await this.auditService.record({
			actorId: userId,
			action: "project.task.deleted",
			module: AUDIT_MODULE,
			entityType: "project_task",
			entityId: row.id,
			metadata: { projectId: row.projectId },
		})

		return { id: row.id, deleted: true }
	}

	async assign(userId: string, payload: AssignTaskRequest): Promise<ProjectTask> {
		const { row, project } = await this.loadAccessibleTask(userId, payload.id)
		this.projectsService.assertMutable(project)

		if (payload.assigneeId) await this.assertUserExists(payload.assigneeId)

		const [updated] = await db
			.update(projectTasks)
			.set({ assigneeId: payload.assigneeId, updatedAt: new Date() })
			.where(eq(projectTasks.id, row.id))
			.returning()

		if (!updated) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Task could not be assigned" })
		}

		await this.auditService.record({
			actorId: userId,
			action: "project.task.assigned",
			module: AUDIT_MODULE,
			entityType: "project_task",
			entityId: updated.id,
			metadata: { projectId: updated.projectId, assigneeId: updated.assigneeId },
		})

		if (updated.assigneeId !== row.assigneeId) {
			await this.notifyAssignment(updated, userId)
		}

		return this.toTask(updated)
	}

	async setStatus(userId: string, payload: SetTaskStatusRequest): Promise<ProjectTask> {
		const { row, project } = await this.loadAccessibleTask(userId, payload.id)
		this.projectsService.assertMutable(project)

		const [updated] = await db
			.update(projectTasks)
			.set({ status: payload.status, updatedAt: new Date() })
			.where(eq(projectTasks.id, row.id))
			.returning()

		if (!updated) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Task status could not be updated" })
		}

		await this.auditService.record({
			actorId: userId,
			action: "project.task.status_changed",
			module: AUDIT_MODULE,
			entityType: "project_task",
			entityId: updated.id,
			metadata: { projectId: updated.projectId, status: updated.status },
		})

		if (payload.status !== row.status) {
			await this.notifyStatusChange(updated, userId)
		}

		return this.toTask(updated)
	}

	// ==========================================================================
	// HELPERS
	// ==========================================================================
	private async loadAccessibleTask(
		userId: string,
		id: number
	): Promise<{ row: TaskRow; project: ProjectRow }> {
		const [row] = await db.select().from(projectTasks).where(eq(projectTasks.id, id))
		if (!row) {
			throw new ORPCError("NOT_FOUND", { message: `Task with ID ${id} not found` })
		}
		// Inherit the parent project's division scope (throws NOT_FOUND if denied).
		const { row: project } = await this.projectsService.loadAccessible(userId, row.projectId)
		return { row, project }
	}

	private async notifyAssignment(row: TaskRow, actorId: string): Promise<void> {
		if (!row.assigneeId || row.assigneeId === actorId) return
		await this.notificationsService.createForUser({
			userId: row.assigneeId,
			type: "task.assigned",
			title: "Task assigned to you",
			body: `You were assigned the task "${row.title}".`,
			linkPath: `/projects/${row.projectId}/tasks`,
		})
	}

	private async notifyStatusChange(row: TaskRow, actorId: string): Promise<void> {
		if (!row.assigneeId || row.assigneeId === actorId) return
		await this.notificationsService.createForUser({
			userId: row.assigneeId,
			type: "task.status_changed",
			title: "Task status updated",
			body: `"${row.title}" moved to ${row.status}.`,
			linkPath: `/projects/${row.projectId}/tasks`,
		})
	}

	private async assertUserExists(userId: string): Promise<void> {
		const [row] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId))
		if (!row) {
			throw new ORPCError("NOT_FOUND", { message: `User ${userId} not found` })
		}
	}

	private toTask(row: TaskRow): ProjectTask {
		return {
			id: row.id,
			projectId: row.projectId,
			title: row.title,
			assigneeId: row.assigneeId,
			dueDate: row.dueDate,
			status: row.status,
			requirements: row.requirements,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}
	}
}
