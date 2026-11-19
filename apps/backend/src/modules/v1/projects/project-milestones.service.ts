import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { asc, eq } from "drizzle-orm"

import {
	type CreateMilestoneInput,
	type DeleteMilestoneResponse,
	type ListMilestonesQuery,
	type ProjectMilestone,
	type SetMilestoneProgressRequest,
	type SetMilestoneStatusRequest,
	type UpdateMilestoneRequest,
} from "@repo/contracts"
import { projectMilestones, projects } from "@repo/db/schema"

import { AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"

import { ProjectsService } from "./projects.service"

/** Owning module label recorded on milestone audit events. */
const AUDIT_MODULE = "projects"

type MilestoneRow = typeof projectMilestones.$inferSelect
type ProjectRow = typeof projects.$inferSelect

@Injectable()
export class ProjectMilestonesService {
	constructor(
		private readonly auditService: AuditService,
		private readonly projectsService: ProjectsService
	) {}

	// ==========================================================================
	// READ
	// ==========================================================================
	async list(userId: string, query: ListMilestonesQuery): Promise<ProjectMilestone[]> {
		await this.projectsService.loadAccessible(userId, query.projectId)

		const rows = await db
			.select()
			.from(projectMilestones)
			.where(eq(projectMilestones.projectId, query.projectId))
			.orderBy(asc(projectMilestones.dueDate), asc(projectMilestones.id))

		return rows.map(row => this.toMilestone(row))
	}

	// ==========================================================================
	// WRITE
	// ==========================================================================
	async create(userId: string, payload: CreateMilestoneInput): Promise<ProjectMilestone> {
		const { row: project } = await this.projectsService.loadAccessible(userId, payload.projectId)
		this.projectsService.assertMutable(project)

		const [row] = await db
			.insert(projectMilestones)
			.values({
				projectId: payload.projectId,
				name: payload.name,
				dueDate: payload.dueDate ?? null,
				status: payload.status ?? "pending",
				progress: payload.progress ?? 0,
			})
			.returning()

		if (!row) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Milestone could not be created" })
		}

		await this.auditService.record({
			actorId: userId,
			action: "project.milestone.created",
			module: AUDIT_MODULE,
			entityType: "project_milestone",
			entityId: row.id,
			metadata: { projectId: row.projectId, name: row.name },
		})

		return this.toMilestone(row)
	}

	async update(userId: string, payload: UpdateMilestoneRequest): Promise<ProjectMilestone> {
		const { row, project } = await this.loadAccessibleMilestone(userId, payload.id)
		this.projectsService.assertMutable(project)

		const [updated] = await db
			.update(projectMilestones)
			.set({
				name: payload.name ?? row.name,
				dueDate: payload.dueDate !== undefined ? payload.dueDate : row.dueDate,
				status: payload.status ?? row.status,
				progress: payload.progress ?? row.progress,
				updatedAt: new Date(),
			})
			.where(eq(projectMilestones.id, row.id))
			.returning()

		if (!updated) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Milestone could not be updated" })
		}

		await this.recordUpdate(userId, updated)
		return this.toMilestone(updated)
	}

	async setStatus(userId: string, payload: SetMilestoneStatusRequest): Promise<ProjectMilestone> {
		const { row, project } = await this.loadAccessibleMilestone(userId, payload.id)
		this.projectsService.assertMutable(project)

		const [updated] = await db
			.update(projectMilestones)
			.set({ status: payload.status, updatedAt: new Date() })
			.where(eq(projectMilestones.id, row.id))
			.returning()

		if (!updated) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Milestone status could not be updated",
			})
		}

		await this.recordUpdate(userId, updated)
		return this.toMilestone(updated)
	}

	async setProgress(
		userId: string,
		payload: SetMilestoneProgressRequest
	): Promise<ProjectMilestone> {
		const { row, project } = await this.loadAccessibleMilestone(userId, payload.id)
		this.projectsService.assertMutable(project)

		const [updated] = await db
			.update(projectMilestones)
			.set({ progress: payload.progress, updatedAt: new Date() })
			.where(eq(projectMilestones.id, row.id))
			.returning()

		if (!updated) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Milestone progress could not be updated",
			})
		}

		await this.recordUpdate(userId, updated)
		return this.toMilestone(updated)
	}

	async delete(userId: string, id: number): Promise<DeleteMilestoneResponse> {
		const { row, project } = await this.loadAccessibleMilestone(userId, id)
		this.projectsService.assertMutable(project)

		await db.delete(projectMilestones).where(eq(projectMilestones.id, row.id))

		await this.auditService.record({
			actorId: userId,
			action: "project.milestone.deleted",
			module: AUDIT_MODULE,
			entityType: "project_milestone",
			entityId: row.id,
			metadata: { projectId: row.projectId },
		})

		return { id: row.id, deleted: true }
	}

	// ==========================================================================
	// HELPERS
	// ==========================================================================
	private async loadAccessibleMilestone(
		userId: string,
		id: number
	): Promise<{ row: MilestoneRow; project: ProjectRow }> {
		const [row] = await db.select().from(projectMilestones).where(eq(projectMilestones.id, id))
		if (!row) {
			throw new ORPCError("NOT_FOUND", { message: `Milestone with ID ${id} not found` })
		}
		const { row: project } = await this.projectsService.loadAccessible(userId, row.projectId)
		return { row, project }
	}

	private async recordUpdate(userId: string, row: MilestoneRow): Promise<void> {
		await this.auditService.record({
			actorId: userId,
			action: "project.milestone.updated",
			module: AUDIT_MODULE,
			entityType: "project_milestone",
			entityId: row.id,
			metadata: { projectId: row.projectId, status: row.status, progress: row.progress },
		})
	}

	private toMilestone(row: MilestoneRow): ProjectMilestone {
		return {
			id: row.id,
			projectId: row.projectId,
			name: row.name,
			dueDate: row.dueDate,
			status: row.status,
			progress: row.progress,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}
	}
}
