import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { desc, eq } from "drizzle-orm"

import { type ProjectClosure, type SubmitClosureInput } from "@repo/contracts"
import { projectClosures, projects } from "@repo/db/schema"

import { AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"
import { NotificationsService } from "@/modules/v1/notifications/notifications.service"

import { ProjectsService } from "./projects.service"

/** Owning module label recorded on closure audit events. */
const AUDIT_MODULE = "projects"

type ClosureRow = typeof projectClosures.$inferSelect

@Injectable()
export class ProjectClosuresService {
	constructor(
		private readonly auditService: AuditService,
		private readonly notificationsService: NotificationsService,
		private readonly projectsService: ProjectsService
	) {}

	/**
	 * Close an active project: persist evaluation metrics and flip status to
	 * `closed`. Frontend supplies the confirmation dialog (T11).
	 */
	async submit(userId: string, payload: SubmitClosureInput): Promise<ProjectClosure> {
		const { row: project } = await this.projectsService.loadAccessible(userId, payload.projectId)

		// A closed project is already read-only/archived: reject a second closure
		// record rather than appending another (Flow 10).
		if (project.status === "closed") {
			throw new ORPCError("CONFLICT", {
				message: "This project is already closed; it cannot be closed again",
			})
		}

		if (project.status !== "active") {
			throw new ORPCError("CONFLICT", {
				message: `Only active projects can be closed (current status: ${project.status})`,
			})
		}

		// Core state (ATOMIC): create the closure record AND flip the project to
		// `closed` in ONE transaction. A closure can never persist without the
		// project actually closing, and vice versa (F5). The duplicate-closure /
		// non-active guards above (F3) run before the transaction opens.
		const closure = await db.transaction(async tx => {
			const [closure] = await tx
				.insert(projectClosures)
				.values({
					projectId: payload.projectId,
					outcomeSummary: payload.outcomeSummary ?? null,
					objectivesMet: payload.objectivesMet ?? null,
					performanceRating: payload.performanceRating ?? null,
					lessonsLearned: payload.lessonsLearned ?? null,
					closedBy: userId,
				})
				.returning()

			if (!closure) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Closure could not be created",
				})
			}

			await tx
				.update(projects)
				.set({ status: "closed", updatedAt: new Date() })
				.where(eq(projects.id, payload.projectId))

			return closure
		})

		// Best-effort side effects AFTER commit: audit + notification. Failures
		// here do not undo the committed closure.
		await this.auditService.record({
			actorId: userId,
			action: "project.closed",
			module: AUDIT_MODULE,
			entityType: "project",
			entityId: project.id,
			metadata: {
				closureId: closure.id,
				performanceRating: closure.performanceRating,
				objectivesMet: closure.objectivesMet,
			},
		})

		if (project.createdBy !== userId) {
			await this.notificationsService.createForUser({
				userId: project.createdBy,
				type: "project.closed",
				title: "Project closed",
				body: `"${project.title}" has been closed.`,
				linkPath: `/projects/${project.id}`,
			})
		}

		return this.toClosure(closure)
	}

	/** Get the latest closure record for a project, or null when not closed. */
	async get(userId: string, projectId: number): Promise<ProjectClosure | null> {
		await this.projectsService.loadAccessible(userId, projectId)

		const [closure] = await db
			.select()
			.from(projectClosures)
			.where(eq(projectClosures.projectId, projectId))
			.orderBy(desc(projectClosures.closedAt))
			.limit(1)

		return closure ? this.toClosure(closure) : null
	}

	private toClosure(row: ClosureRow): ProjectClosure {
		return {
			id: row.id,
			projectId: row.projectId,
			outcomeSummary: row.outcomeSummary,
			objectivesMet: row.objectivesMet,
			performanceRating: row.performanceRating,
			lessonsLearned: row.lessonsLearned,
			closedBy: row.closedBy,
			closedAt: row.closedAt,
		}
	}
}
