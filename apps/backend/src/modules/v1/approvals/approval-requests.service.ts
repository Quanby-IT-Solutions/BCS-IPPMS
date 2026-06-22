import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { and, asc, desc, eq } from "drizzle-orm"

import {
	type ActOnRequestInput,
	type ApprovalRequestDetail,
	type ApprovalRequestSummary,
} from "@repo/contracts"
import {
	approvalActions,
	approvalRequests,
	approvalSteps,
	approvalWorkflows,
	roles,
	users,
} from "@repo/db/schema"

import { ApprovalEngineService } from "@/common/approval/approval-engine.service"
import { db } from "@/common/database/database.client"
import { RbacService } from "@/common/rbac/rbac.service"

@Injectable()
export class ApprovalRequestsService {
	constructor(
		private readonly engine: ApprovalEngineService,
		private readonly rbacService: RbacService
	) {}

	/**
	 * "My Approvals" inbox: pending requests the user is eligible to act on.
	 * Admins see every pending request; scoped users see requests whose current
	 * step role they hold within their own division, PLUS requests delegated to
	 * them at the current step (F2 — delegation is enforceable from stored data).
	 */
	async inbox(userId: string): Promise<ApprovalRequestSummary[]> {
		const isAdmin = await this.rbacService.hasRole(userId, "Admin")

		const rows = await this.queryPending()

		if (isAdmin) {
			return rows.map(row => this.toSummary(row))
		}

		const [actor] = await db
			.select({ divisionId: users.divisionId })
			.from(users)
			.where(eq(users.id, userId))
		const actorDivisionId = actor?.divisionId ?? null
		const roleIds = new Set(await this.engine.getUserRoleIds(userId))

		const summaries: ApprovalRequestSummary[] = []
		for (const row of rows) {
			const roleEligible =
				row.currentStepRoleId !== null &&
				roleIds.has(row.currentStepRoleId) &&
				// Scoped approvers only act within their own division.
				(row.request.divisionId === null || row.request.divisionId === actorDivisionId)

			// Delegated authority: surface requests delegated to this user at the
			// current step even when they don't hold the step role or division.
			const delegated =
				!roleEligible &&
				(await this.engine.getActiveDelegateForStep(
					row.request.id,
					row.request.currentStepOrder
				)) === userId

			if (roleEligible || delegated) summaries.push(this.toSummary(row))
		}

		return summaries
	}

	/** Full request detail with chain + action history (status tracker). */
	async getDetail(id: number, userId: string): Promise<ApprovalRequestDetail> {
		return this.loadDetail(id, userId, false)
	}

	/**
	 * Detail loader shared by public reads and post-action responses.
	 *
	 * `actedOnThisRequest` is set only by `act()` after the engine confirms the
	 * actor successfully acted on this exact request. It grants request-scoped
	 * read access so the actor receives the updated detail even when the request
	 * advanced to a step where their step-scoped delegation no longer applies.
	 * It never broadens direct/public `getDetail` access.
	 */
	private async loadDetail(
		id: number,
		userId: string,
		actedOnThisRequest: boolean
	): Promise<ApprovalRequestDetail> {
		const [row] = await this.baseQuery().where(eq(approvalRequests.id, id))
		if (!row) {
			throw new ORPCError("NOT_FOUND", { message: `Approval request with ID ${id} not found` })
		}

		if (!actedOnThisRequest) {
			const isAdmin = await this.rbacService.hasRole(userId, "Admin")
			if (!isAdmin) {
				const [actor] = await db
					.select({ divisionId: users.divisionId })
					.from(users)
					.where(eq(users.id, userId))
				const sameDivision =
					row.request.divisionId !== null && row.request.divisionId === (actor?.divisionId ?? null)
				const isRequester = row.request.requestedBy === userId
				// A delegate at the current step may view the request even if they are
				// outside its division (e.g. so act() can return detail after they act).
				const isDelegate =
					(await this.engine.getActiveDelegateForStep(
						row.request.id,
						row.request.currentStepOrder
					)) === userId
				if (!sameDivision && !isRequester && !isDelegate) {
					throw new ORPCError("NOT_FOUND", {
						message: `Approval request with ID ${id} not found`,
					})
				}
			}
		}

		const stepRows = await db
			.select({ step: approvalSteps, roleName: roles.name })
			.from(approvalSteps)
			.leftJoin(roles, eq(approvalSteps.approverRoleId, roles.id))
			.where(eq(approvalSteps.workflowId, row.request.workflowId))
			.orderBy(asc(approvalSteps.stepOrder))

		const actionRows = await db
			.select()
			.from(approvalActions)
			.where(eq(approvalActions.requestId, id))
			.orderBy(desc(approvalActions.createdAt))

		return {
			...this.toSummary(row),
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
		}
	}

	/** Approve / reject / delegate / escalate, then return the updated detail. */
	async act(userId: string, input: ActOnRequestInput): Promise<ApprovalRequestDetail> {
		// Action-specific permission gate (expanded catalog: approval-actions:<action>).
		// Wildcard approval-actions:* and Admin bypass are honored by hasPermission.
		// Role-step eligibility is enforced separately inside the engine; both are required.
		const allowed = await this.rbacService.hasPermission(userId, `approval-actions:${input.action}`)
		if (!allowed) {
			throw new ORPCError("FORBIDDEN", {
				message: `You do not have permission to ${input.action} approval requests`,
			})
		}

		await this.engine.actOnRequest({
			requestId: input.id,
			actorId: userId,
			action: input.action,
			note: input.note ?? null,
			delegateToUserId: input.delegateToUserId ?? null,
		})

		// Actor just successfully acted on this request, so grant request-scoped
		// read access for the response even if the request advanced past their
		// (now-ended) step-scoped delegation. Direct getDetail stays strict.
		return this.loadDetail(input.id, userId, true)
	}

	// ==========================================================================
	// HELPERS
	// ==========================================================================
	private baseQuery() {
		return db
			.select({
				request: approvalRequests,
				module: approvalWorkflows.module,
				currentStepRoleId: approvalSteps.approverRoleId,
				currentStepRoleName: roles.name,
			})
			.from(approvalRequests)
			.innerJoin(approvalWorkflows, eq(approvalRequests.workflowId, approvalWorkflows.id))
			.leftJoin(
				approvalSteps,
				and(
					eq(approvalSteps.workflowId, approvalRequests.workflowId),
					eq(approvalSteps.stepOrder, approvalRequests.currentStepOrder)
				)
			)
			.leftJoin(roles, eq(approvalSteps.approverRoleId, roles.id))
	}

	private queryPending() {
		return this.baseQuery()
			.where(eq(approvalRequests.status, "pending"))
			.orderBy(desc(approvalRequests.createdAt))
	}

	private toSummary(row: {
		request: typeof approvalRequests.$inferSelect
		module: "projects" | "job_orders"
		currentStepRoleId: number | null
		currentStepRoleName: string | null
	}): ApprovalRequestSummary {
		return {
			id: row.request.id,
			module: row.module,
			subjectType: row.request.subjectType,
			subjectId: row.request.subjectId,
			workflowId: row.request.workflowId,
			divisionId: row.request.divisionId,
			currentStepOrder: row.request.currentStepOrder,
			status: row.request.status,
			requestedBy: row.request.requestedBy,
			currentStepRoleId: row.request.status === "pending" ? row.currentStepRoleId : null,
			currentStepRoleName: row.request.status === "pending" ? row.currentStepRoleName : null,
			createdAt: row.request.createdAt,
			updatedAt: row.request.updatedAt,
		}
	}
}
