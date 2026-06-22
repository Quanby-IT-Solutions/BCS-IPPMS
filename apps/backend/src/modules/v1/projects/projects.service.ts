import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { and, asc, desc, eq } from "drizzle-orm"

import {
	type CreateProjectInput,
	type ListProjectsQuery,
	type Project,
	type ProjectApprovalStatus,
	type UpdateProjectRequest,
} from "@repo/contracts"
import {
	approvalActions,
	approvalRequests,
	approvalSteps,
	divisions,
	projects,
	roles,
} from "@repo/db/schema"

import {
	ApprovalEngineService,
	type OpenRequestInput,
} from "@/common/approval/approval-engine.service"
import { AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"
import {
	DivisionScopeService,
	type DivisionAccessContext,
} from "@/common/division-scope/division-scope.service"
import { NotificationsService } from "@/modules/v1/notifications/notifications.service"

/** Owning module label recorded on project audit events. */
const AUDIT_MODULE = "projects"

/** Polymorphic subject type used when routing a project into the approval engine. */
const SUBJECT_TYPE = "project"

type ProjectRow = typeof projects.$inferSelect

@Injectable()
export class ProjectsService {
	constructor(
		private readonly auditService: AuditService,
		private readonly divisionScope: DivisionScopeService,
		private readonly approvalEngine: ApprovalEngineService,
		private readonly notificationsService: NotificationsService
	) {}

	// ==========================================================================
	// READ
	// ==========================================================================
	async list(userId: string, query: ListProjectsQuery): Promise<Project[]> {
		const context = await this.divisionScope.resolveContext(userId)

		const conditions = []
		const scopeFilter = this.divisionScope.divisionFilter(context, projects.divisionId)
		if (scopeFilter) conditions.push(scopeFilter)
		if (query.status) conditions.push(eq(projects.status, query.status))
		// Admins may narrow to a single division explicitly.
		if (context.isAdmin && query.divisionId) {
			conditions.push(eq(projects.divisionId, query.divisionId))
		}

		const rows = await db
			.select()
			.from(projects)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(desc(projects.createdAt))

		return rows.map(row => this.toProject(row))
	}

	async get(userId: string, id: number): Promise<Project> {
		const { row } = await this.loadAccessible(userId, id)
		return this.toProject(row)
	}

	/**
	 * Load a project the user may access, or throw NOT_FOUND. Shared with the
	 * task/milestone/closure services so child resources inherit project scope.
	 */
	async loadAccessible(
		userId: string,
		id: number
	): Promise<{ row: ProjectRow; context: DivisionAccessContext }> {
		const context = await this.divisionScope.resolveContext(userId)
		const [row] = await db.select().from(projects).where(eq(projects.id, id))

		// Fail-closed: surface inaccessible rows as not-found (no existence leak).
		if (!row || !this.divisionScope.canAccessDivision(context, row.divisionId)) {
			throw new ORPCError("NOT_FOUND", { message: `Project with ID ${id} not found` })
		}

		return { row, context }
	}

	/**
	 * Guard shared with the task/milestone/closure services: a closed project is
	 * read-only/archived (Flow 10), so any child-resource mutation must be
	 * rejected with a CONFLICT. Read/list/get paths must NOT call this.
	 */
	assertMutable(project: Pick<ProjectRow, "status">): void {
		if (project.status === "closed") {
			throw new ORPCError("CONFLICT", {
				message: "This project is closed and read-only; it can no longer be modified",
			})
		}
	}

	// ==========================================================================
	// WRITE
	// ==========================================================================
	async create(userId: string, payload: CreateProjectInput): Promise<Project> {
		const context = await this.divisionScope.resolveContext(userId)
		const divisionId = await this.resolveCreateDivision(context, payload.divisionId)

		const [row] = await db
			.insert(projects)
			.values({
				title: payload.title,
				divisionId,
				status: "draft",
				objectives: payload.objectives ?? null,
				scope: payload.scope ?? null,
				deliverables: payload.deliverables ?? null,
				createdBy: userId,
			})
			.returning()

		if (!row) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Project could not be created" })
		}

		await this.auditService.record({
			actorId: userId,
			action: "project.created",
			module: AUDIT_MODULE,
			entityType: "project",
			entityId: row.id,
			metadata: { title: row.title, divisionId: row.divisionId },
		})

		return this.toProject(row)
	}

	async update(userId: string, payload: UpdateProjectRequest): Promise<Project> {
		const { row, context } = await this.loadAccessible(userId, payload.id)

		this.assertMutable(row)

		let nextDivisionId = row.divisionId
		if (payload.divisionId !== undefined && payload.divisionId !== row.divisionId) {
			// Only admins may move a project; scoped users cannot push it out of
			// their own division.
			if (!context.isAdmin) {
				throw new ORPCError("FORBIDDEN", {
					message: "You cannot move a project to another division",
				})
			}
			await this.assertDivisionExists(payload.divisionId)
			nextDivisionId = payload.divisionId
		}

		const [updated] = await db
			.update(projects)
			.set({
				title: payload.title ?? row.title,
				objectives: payload.objectives !== undefined ? payload.objectives : row.objectives,
				scope: payload.scope !== undefined ? payload.scope : row.scope,
				deliverables:
					payload.deliverables !== undefined ? payload.deliverables : row.deliverables,
				divisionId: nextDivisionId,
				updatedAt: new Date(),
			})
			.where(eq(projects.id, row.id))
			.returning()

		if (!updated) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Project could not be updated" })
		}

		await this.auditService.record({
			actorId: userId,
			action: "project.updated",
			module: AUDIT_MODULE,
			entityType: "project",
			entityId: updated.id,
			metadata: { title: updated.title, divisionId: updated.divisionId },
		})

		return this.toProject(updated)
	}

	// ==========================================================================
	// LIFECYCLE TRANSITIONS
	// ==========================================================================
	/**
	 * Submit a draft proposal into its division's approval chain. Routes through
	 * the generic {@link ApprovalEngineService}, which blocks (throws) when no
	 * active chain exists for the project's module + division.
	 */
	async submit(userId: string, id: number): Promise<Project> {
		const { row } = await this.loadAccessible(userId, id)

		if (row.status !== "draft") {
			throw new ORPCError("CONFLICT", {
				message: `Only draft projects can be submitted (current status: ${row.status})`,
			})
		}

		if (row.divisionId === null) {
			throw new ORPCError("BAD_REQUEST", {
				message: "A project must belong to a division before it can be submitted for approval",
			})
		}

		const openInput: OpenRequestInput = {
			module: "projects",
			subjectType: SUBJECT_TYPE,
			subjectId: row.id,
			divisionId: row.divisionId,
			requestedBy: userId,
		}

		// Core state (ATOMIC): open the approval request AND flip the project to
		// `in_approval` in ONE transaction. Neither side can persist without the
		// other (F5) — a rolled-back request leaves the project as `draft`, and a
		// failed status update unwinds the request insert. `createRequestTx` throws
		// BAD_REQUEST when no active chain exists for (projects, division).
		const { opened, updated } = await db.transaction(async tx => {
			const opened = await this.approvalEngine.createRequestTx(tx, openInput)

			const [updated] = await tx
				.update(projects)
				.set({ status: "in_approval", updatedAt: new Date() })
				.where(eq(projects.id, row.id))
				.returning()

			if (!updated) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Project could not be submitted",
				})
			}

			return { opened, updated }
		})

		// Best-effort side effects AFTER commit: approval-engine notifications/audit
		// plus the project-submitted audit event. Failures here do not undo the
		// committed submission.
		await this.approvalEngine.notifyRequestOpened(openInput, opened)

		await this.auditService.record({
			actorId: userId,
			action: "project.submitted",
			module: AUDIT_MODULE,
			entityType: "project",
			entityId: updated.id,
			metadata: { divisionId: updated.divisionId, approvalRequestId: opened.request.id },
		})

		return this.toProject(updated)
	}

	/**
	 * Manually transition an In Approval project to Active. Acceptable interim
	 * until an approval-completion callback wires this automatically. Requires the
	 * latest approval request to have been approved; pending/rejected/missing
	 * requests are blocked.
	 */
	async activate(userId: string, id: number): Promise<Project> {
		const { row } = await this.loadAccessible(userId, id)

		if (row.status !== "in_approval") {
			throw new ORPCError("CONFLICT", {
				message: `Only In Approval projects can be activated (current status: ${row.status})`,
			})
		}

		const latest = await this.latestRequest(row.id)
		if (!latest) {
			throw new ORPCError("BAD_REQUEST", {
				message: "No approval request exists for this project",
			})
		}
		if (latest.status === "pending") {
			throw new ORPCError("CONFLICT", {
				message: "The proposal is still pending approval",
			})
		}
		if (latest.status === "rejected") {
			throw new ORPCError("CONFLICT", {
				message: "The proposal was rejected and cannot be activated",
			})
		}
		if (latest.status !== "approved") {
			throw new ORPCError("CONFLICT", {
				message: `The proposal must be approved before activation (current status: ${latest.status})`,
			})
		}

		const [updated] = await db
			.update(projects)
			.set({ status: "active", updatedAt: new Date() })
			.where(eq(projects.id, row.id))
			.returning()

		if (!updated) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Project could not be activated" })
		}

		await this.auditService.record({
			actorId: userId,
			action: "project.activated",
			module: AUDIT_MODULE,
			entityType: "project",
			entityId: updated.id,
			metadata: { divisionId: updated.divisionId },
		})

		if (updated.createdBy !== userId) {
			await this.notificationsService.createForUser({
				userId: updated.createdBy,
				type: "project.activated",
				title: "Project activated",
				body: `"${updated.title}" is now active.`,
				linkPath: `/projects/${updated.id}`,
			})
		}

		return this.toProject(updated)
	}

	// ==========================================================================
	// APPROVAL STATUS TRACKER (read-only)
	// ==========================================================================
	async approvalStatus(userId: string, id: number): Promise<ProjectApprovalStatus> {
		await this.loadAccessible(userId, id)

		const request = await this.latestRequest(id)
		if (!request) return null

		const stepRows = await db
			.select({ step: approvalSteps, roleName: roles.name })
			.from(approvalSteps)
			.leftJoin(roles, eq(approvalSteps.approverRoleId, roles.id))
			.where(eq(approvalSteps.workflowId, request.workflowId))
			.orderBy(asc(approvalSteps.stepOrder))

		const actionRows = await db
			.select()
			.from(approvalActions)
			.where(eq(approvalActions.requestId, request.id))
			.orderBy(desc(approvalActions.createdAt))

		return {
			requestId: request.id,
			status: request.status,
			currentStepOrder: request.currentStepOrder,
			divisionId: request.divisionId,
			requestedBy: request.requestedBy,
			steps: stepRows.map(item => ({
				id: item.step.id,
				workflowId: item.step.workflowId,
				stepOrder: item.step.stepOrder,
				approverRoleId: item.step.approverRoleId,
				approverRoleName: item.roleName ?? null,
			})),
			actions: actionRows.map(action => ({
				id: action.id,
				requestId: action.requestId,
				stepOrder: action.stepOrder,
				actorId: action.actorId,
				action: action.action,
				delegateToUserId: action.delegateToUserId,
				note: action.note,
				createdAt: action.createdAt,
			})),
			createdAt: request.createdAt,
			updatedAt: request.updatedAt,
		}
	}

	// ==========================================================================
	// HELPERS
	// ==========================================================================
	private async latestRequest(projectId: number) {
		const [request] = await db
			.select()
			.from(approvalRequests)
			.where(
				and(
					eq(approvalRequests.subjectType, SUBJECT_TYPE),
					eq(approvalRequests.subjectId, projectId)
				)
			)
			.orderBy(desc(approvalRequests.createdAt))
			.limit(1)
		return request ?? null
	}

	private async resolveCreateDivision(
		context: DivisionAccessContext,
		requested: number | undefined
	): Promise<number | null> {
		if (context.isAdmin) {
			if (requested !== undefined) {
				await this.assertDivisionExists(requested)
				return requested
			}
			return null
		}

		// Non-admins are scoped to their own division and fail closed without one.
		if (context.divisionId === null) {
			throw new ORPCError("FORBIDDEN", {
				message: "You must belong to a division to create a project",
			})
		}
		if (requested !== undefined && requested !== context.divisionId) {
			throw new ORPCError("FORBIDDEN", {
				message: "You cannot create a project outside your own division",
			})
		}
		return context.divisionId
	}

	private async assertDivisionExists(id: number): Promise<void> {
		const [row] = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.id, id))
		if (!row) {
			throw new ORPCError("NOT_FOUND", { message: `Division with ID ${id} not found` })
		}
	}

	private toProject(row: ProjectRow): Project {
		return {
			id: row.id,
			title: row.title,
			divisionId: row.divisionId,
			status: row.status,
			objectives: row.objectives,
			scope: row.scope,
			deliverables: row.deliverables,
			createdBy: row.createdBy,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}
	}
}
