import { Injectable, Logger } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { and, asc, desc, eq } from "drizzle-orm"

import { type ApprovalActionType, type ApprovalModule } from "@repo/contracts"
import {
	approvalActions,
	approvalRequests,
	approvalSteps,
	approvalWorkflows,
	userRoles,
	users,
} from "@repo/db/schema"

import { AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"
import { RbacService } from "@/common/rbac/rbac.service"
import { NotificationsService } from "@/modules/v1/notifications/notifications.service"

/** Owning module label recorded on approval audit events. */
const AUDIT_MODULE = "approvals"

type ApprovalRequestRow = typeof approvalRequests.$inferSelect
type ApprovalStepRow = typeof approvalSteps.$inferSelect

/**
 * Executor accepted by transaction-participating writes: the Drizzle transaction
 * handle passed to a `db.transaction(tx => ...)` callback. Lets a feature service
 * (e.g. Projects submit) compose the request insert with its own writes in ONE
 * atomic transaction.
 */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Result of the core, transaction-participating request insert. Carries the data
 * needed to run best-effort notifications/audit AFTER the surrounding transaction
 * commits (see {@link ApprovalEngineService.notifyRequestOpened}).
 */
export interface OpenedRequest {
	request: ApprovalRequestRow
	firstStep: ApprovalStepRow
	module: ApprovalModule
}

/**
 * The state transition an approval action produces, resolved BEFORE any write so
 * the DB mutation and its post-commit side effects stay in lock-step. `set` is
 * the partial `approval_requests` patch (an `updatedAt` stamp is merged in by the
 * caller); `fallback` reconstructs the returned row if `.returning()` is empty.
 */
type ActionTransition =
	| {
			kind: "finalize"
			status: "approved" | "rejected"
			set: Partial<typeof approvalRequests.$inferInsert>
			fallback: Partial<ApprovalRequestRow>
	  }
	| {
			kind: "advance"
			via: "approve" | "escalate"
			nextStep: ApprovalStepRow
			set: Partial<typeof approvalRequests.$inferInsert>
			fallback: Partial<ApprovalRequestRow>
	  }
	| {
			kind: "delegate"
			currentStep: ApprovalStepRow
			set: Partial<typeof approvalRequests.$inferInsert>
			fallback: Partial<ApprovalRequestRow>
	  }

/** Input for opening a new approval request against a module subject. */
export interface OpenRequestInput {
	module: ApprovalModule
	divisionId: number
	subjectType: string
	subjectId: number
	requestedBy: string
}

/** Input for acting on a pending approval request. */
export interface ActOnRequestInput {
	requestId: number
	actorId: string
	action: ApprovalActionType
	note?: string | null
	delegateToUserId?: string | null
}

/**
 * Generic, reusable approval engine.
 *
 * Owns no HTTP endpoints. Feature modules (e.g. Projects in T5) call
 * {@link openRequest} to route a polymorphic subject into the workflow chain
 * configured for its module + division, and the approvals inbox controller
 * calls {@link actOnRequest} to record approver decisions and progress routing.
 *
 * Routing rules (Tech Plan §1):
 * - A request is blocked at submission when no active chain exists for the
 *   exact module + division.
 * - Step eligibility is role-based: any user holding the current step's role
 *   within the request's division may act; an Admin bypasses and may always act.
 */
@Injectable()
export class ApprovalEngineService {
	private readonly logger = new Logger(ApprovalEngineService.name)

	constructor(
		private readonly auditService: AuditService,
		private readonly notificationsService: NotificationsService,
		private readonly rbacService: RbacService
	) {}

	// ==========================================================================
	// OPEN
	// ==========================================================================
	/**
	 * Core, transaction-participating write for opening an approval request:
	 * resolves the active workflow + first step and inserts the
	 * `approval_requests` row using the supplied executor. Performs NO
	 * notifications or audit — those are best-effort side effects that callers
	 * MUST run via {@link notifyRequestOpened} AFTER the surrounding transaction
	 * commits, so they never fire for a request that was rolled back.
	 *
	 * Throws when no active chain (or no steps) is configured — submission is
	 * blocked and the caller's transaction unwinds.
	 */
	async createRequestTx(tx: DbTransaction, input: OpenRequestInput): Promise<OpenedRequest> {
		const [workflow] = await tx
			.select()
			.from(approvalWorkflows)
			.where(
				and(
					eq(approvalWorkflows.module, input.module),
					eq(approvalWorkflows.divisionId, input.divisionId),
					eq(approvalWorkflows.isActive, true)
				)
			)

		if (!workflow) {
			throw new ORPCError("BAD_REQUEST", {
				message: `No active approval workflow is configured for "${input.module}" in this division. Configure a workflow before submitting.`,
			})
		}

		const steps = await tx
			.select()
			.from(approvalSteps)
			.where(eq(approvalSteps.workflowId, workflow.id))
			.orderBy(asc(approvalSteps.stepOrder))
		const firstStep = steps[0]
		if (!firstStep) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Approval workflow for "${input.module}" has no steps configured.`,
			})
		}

		const [request] = await tx
			.insert(approvalRequests)
			.values({
				subjectType: input.subjectType,
				subjectId: input.subjectId,
				workflowId: workflow.id,
				divisionId: input.divisionId,
				currentStepOrder: firstStep.stepOrder,
				status: "pending",
				requestedBy: input.requestedBy,
			})
			.returning()

		if (!request) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Approval request could not be created",
			})
		}

		return { request, firstStep, module: input.module }
	}

	/**
	 * Best-effort notifications + audit for a newly opened request. Call this
	 * ONLY after the transaction that created the request has committed — never
	 * before — so notifications cannot reference a rolled-back request. A failure
	 * here does not undo the committed request (documented boundary).
	 */
	async notifyRequestOpened(input: OpenRequestInput, opened: OpenedRequest): Promise<void> {
		await this.notifyStepApprovers(opened.firstStep, input.divisionId, opened.request, {
			type: "approval.pending",
			title: "Approval needed",
			body: `A ${input.module} item is awaiting your approval.`,
			excludeUserId: input.requestedBy,
		})

		await this.auditService.record({
			actorId: input.requestedBy,
			action: "approval.request.opened",
			module: AUDIT_MODULE,
			entityType: "approval_request",
			entityId: opened.request.id,
			metadata: {
				module: input.module,
				subjectType: input.subjectType,
				subjectId: input.subjectId,
				divisionId: input.divisionId,
				workflowId: opened.request.workflowId,
			},
		})
	}

	/**
	 * Open an approval request for a subject and route it to the first step of
	 * the active workflow chain for its module + division. Throws when no active
	 * chain is configured (submission is blocked).
	 *
	 * The core insert runs in its own transaction; notifications/audit run after
	 * commit. Feature services that must atomically pair the request with their
	 * own state change should instead call {@link createRequestTx} inside their
	 * transaction and {@link notifyRequestOpened} after it commits.
	 */
	async openRequest(input: OpenRequestInput): Promise<ApprovalRequestRow> {
		const opened = await db.transaction(tx => this.createRequestTx(tx, input))
		await this.notifyRequestOpened(input, opened)
		return opened.request
	}

	// ==========================================================================
	// ACT
	// ==========================================================================
	/**
	 * Record an approver action on a pending request and progress routing.
	 * Validates that the request is pending and that the actor is eligible for
	 * the current step (holds its role within the request's division, or Admin).
	 */
	async actOnRequest(input: ActOnRequestInput): Promise<ApprovalRequestRow> {
		const [request] = await db
			.select()
			.from(approvalRequests)
			.where(eq(approvalRequests.id, input.requestId))

		if (!request) {
			throw new ORPCError("NOT_FOUND", {
				message: `Approval request with ID ${input.requestId} not found`,
			})
		}

		if (request.status !== "pending") {
			throw new ORPCError("CONFLICT", {
				message: `Request is already ${request.status} and can no longer be actioned`,
			})
		}

		const steps = await this.loadSteps(request.workflowId)
		const currentIndex = steps.findIndex(step => step.stepOrder === request.currentStepOrder)
		const currentStep = steps[currentIndex]
		if (!currentStep) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Current approval step could not be resolved",
			})
		}

		const eligible = await this.isActorEligible(input.actorId, request, currentStep)
		if (!eligible) {
			throw new ORPCError("FORBIDDEN", {
				message: "You are not eligible to act on the current approval step",
			})
		}

		const nextStep = steps[currentIndex + 1] ?? null

		// Validate action-specific preconditions before recording anything.
		if (input.action === "delegate") {
			await this.assertUserExists(input.delegateToUserId)
		}
		if (input.action === "escalate" && !nextStep) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Cannot escalate: the request is already at the final step",
			})
		}

		// Resolve the request-state transition this action produces (no writes yet).
		const transition = this.resolveTransition(input, currentStep, nextStep)

		// Core state (ATOMIC): record the `approval_actions` row AND apply the
		// matching `approval_requests` transition in one transaction. Either both
		// persist or neither does — an action can never be recorded without its
		// status/currentStepOrder change, and vice versa (F5).
		const updated = await db.transaction(async tx => {
			await tx.insert(approvalActions).values({
				requestId: request.id,
				stepOrder: request.currentStepOrder,
				actorId: input.actorId,
				action: input.action,
				delegateToUserId:
					input.action === "delegate" ? (input.delegateToUserId ?? null) : null,
				note: input.note ?? null,
			})

			const [row] = await tx
				.update(approvalRequests)
				.set({ ...transition.set, updatedAt: new Date() })
				.where(eq(approvalRequests.id, request.id))
				.returning()

			return row ?? ({ ...request, ...transition.fallback } as ApprovalRequestRow)
		})

		// Best-effort side effects AFTER commit: notifications + audit. A failure
		// here does NOT roll back the committed transition (documented boundary) —
		// core request/action state is already durable.
		await this.runActionSideEffects(input, request, transition)

		return updated
	}

	// ==========================================================================
	// ELIGIBILITY (shared with the inbox read path)
	// ==========================================================================
	/** Role ids held by a user. */
	async getUserRoleIds(userId: string): Promise<number[]> {
		const rows = await db
			.select({ roleId: userRoles.roleId })
			.from(userRoles)
			.where(eq(userRoles.userId, userId))
		return rows.map(row => row.roleId)
	}

	/**
	 * User ids eligible to act on a step: holders of the step's role whose
	 * division matches the request's division. Admins are not enumerated here
	 * (they bypass via role short-circuit) to avoid notification noise.
	 */
	async eligibleApproverIds(roleId: number, divisionId: number | null): Promise<string[]> {
		const conditions = [eq(userRoles.roleId, roleId)]
		if (divisionId !== null) {
			conditions.push(eq(users.divisionId, divisionId))
		}

		const rows = await db
			.select({ userId: users.id })
			.from(userRoles)
			.innerJoin(users, eq(userRoles.userId, users.id))
			.where(and(...conditions))

		return rows.map(row => row.userId)
	}

	/**
	 * The user (if any) currently holding delegated authority for a request's
	 * current step, derived purely from stored `approval_actions` rows.
	 *
	 * Uses the LATEST `delegate` action recorded at `stepOrder` for the request:
	 * a re-delegation supersedes earlier ones, so only the most recent target is
	 * granted authority. Returns null when no delegation is in effect for the
	 * step. Scoped to a single request + step — it confers nothing on other
	 * requests or future steps (each step starts with an empty delegation slate).
	 */
	async getActiveDelegateForStep(requestId: number, stepOrder: number): Promise<string | null> {
		const [row] = await db
			.select({ delegateToUserId: approvalActions.delegateToUserId })
			.from(approvalActions)
			.where(
				and(
					eq(approvalActions.requestId, requestId),
					eq(approvalActions.stepOrder, stepOrder),
					eq(approvalActions.action, "delegate")
				)
			)
			.orderBy(desc(approvalActions.createdAt))
			.limit(1)

		return row?.delegateToUserId ?? null
	}

	/**
	 * Whether an actor may act on the given request's current step.
	 *
	 * Eligibility is additive (F2 semantics — delegation does NOT make the step
	 * exclusive): a user qualifies if ANY of the following holds:
	 *   1. Admin (global bypass).
	 *   2. Active delegate for this request's current step (named directly via a
	 *      `delegate` action) — checked before the division/role gate because the
	 *      delegate need not belong to the request's division nor hold the step
	 *      role. The grant is scoped to this request + current step only.
	 *   3. Holds the step's approver role within the request's division (the
	 *      original role pool, which remains eligible after a delegation).
	 *
	 * Action-specific RBAC permission checks (approval-actions:<action>) are
	 * enforced separately at the controller/service layer and are NOT bypassed.
	 */
	async isActorEligible(
		actorId: string,
		request: ApprovalRequestRow,
		currentStep: ApprovalStepRow
	): Promise<boolean> {
		if (await this.rbacService.hasRole(actorId, "Admin")) return true

		// Delegated authority (scoped to this request + current step).
		const activeDelegate = await this.getActiveDelegateForStep(request.id, currentStep.stepOrder)
		if (activeDelegate === actorId) return true

		const [actor] = await db
			.select({ divisionId: users.divisionId })
			.from(users)
			.where(eq(users.id, actorId))
		if (!actor) return false

		// Division match: a scoped approver must belong to the request's division.
		if (request.divisionId !== null && actor.divisionId !== request.divisionId) return false

		const roleIds = await this.getUserRoleIds(actorId)
		return roleIds.includes(currentStep.approverRoleId)
	}

	// ==========================================================================
	// INTERNAL
	// ==========================================================================
	/**
	 * Map an action to its request-state transition WITHOUT writing. Keeps the
	 * routing semantics identical to the prior `applyAction` switch:
	 * - reject            → finalize "rejected"
	 * - approve + nextStep → advance "approve"
	 * - approve, no next  → finalize "approved"
	 * - escalate          → advance "escalate" (nextStep precondition pre-checked)
	 * - delegate          → stays on the same step (touch `updatedAt` only)
	 */
	private resolveTransition(
		input: ActOnRequestInput,
		currentStep: ApprovalStepRow,
		nextStep: ApprovalStepRow | null
	): ActionTransition {
		switch (input.action) {
			case "reject":
				return {
					kind: "finalize",
					status: "rejected",
					set: { status: "rejected" },
					fallback: { status: "rejected" },
				}

			case "approve":
				return nextStep
					? {
							kind: "advance",
							via: "approve",
							nextStep,
							set: { currentStepOrder: nextStep.stepOrder },
							fallback: { currentStepOrder: nextStep.stepOrder },
						}
					: {
							kind: "finalize",
							status: "approved",
							set: { status: "approved" },
							fallback: { status: "approved" },
						}

			case "escalate": {
				// Precondition (nextStep exists) already validated by the caller.
				const target = nextStep as ApprovalStepRow
				return {
					kind: "advance",
					via: "escalate",
					nextStep: target,
					set: { currentStepOrder: target.stepOrder },
					fallback: { currentStepOrder: target.stepOrder },
				}
			}

			case "delegate":
				// Delegation keeps the request on the same step; only `updatedAt`
				// moves (the caller merges that stamp into `set`).
				return { kind: "delegate", currentStep, set: {}, fallback: {} }
		}
	}

	/**
	 * Best-effort notifications + audit for a committed action. Runs AFTER the
	 * core transaction commits — failures here do not roll back request/action
	 * state. `request` is the pre-transition snapshot (its `currentStepOrder` is
	 * the step the action was recorded against), matching prior behaviour.
	 */
	private async runActionSideEffects(
		input: ActOnRequestInput,
		request: ApprovalRequestRow,
		transition: ActionTransition
	): Promise<void> {
		switch (transition.kind) {
			case "finalize":
				await this.sideEffectsFinalize(input, request, transition.status)
				return
			case "advance":
				await this.sideEffectsAdvance(input, request, transition.nextStep, transition.via)
				return
			case "delegate":
				await this.sideEffectsDelegate(input, request, transition.currentStep)
				return
		}
	}

	private async sideEffectsFinalize(
		input: ActOnRequestInput,
		request: ApprovalRequestRow,
		status: "approved" | "rejected"
	): Promise<void> {
		await this.notificationsService.createForUser({
			userId: request.requestedBy,
			type: status === "approved" ? "approval.approved" : "approval.rejected",
			title: status === "approved" ? "Request approved" : "Request rejected",
			body:
				status === "approved"
					? "Your request has completed all approval steps."
					: `Your request was rejected${input.note ? `: ${input.note}` : "."}`,
		})

		await this.auditService.record({
			actorId: input.actorId,
			action: status === "approved" ? "approval.request.approved" : "approval.request.rejected",
			module: AUDIT_MODULE,
			entityType: "approval_request",
			entityId: request.id,
			metadata: { stepOrder: request.currentStepOrder, note: input.note ?? null },
		})
	}

	private async sideEffectsAdvance(
		input: ActOnRequestInput,
		request: ApprovalRequestRow,
		nextStep: ApprovalStepRow,
		via: "approve" | "escalate"
	): Promise<void> {
		await this.notifyStepApprovers(nextStep, request.divisionId, request, {
			type: "approval.pending",
			title: via === "escalate" ? "Approval escalated to you" : "Approval needed",
			body:
				via === "escalate"
					? `A request was escalated to your step${input.note ? `: ${input.note}` : "."}`
					: "A request has advanced to your approval step.",
			excludeUserId: input.actorId,
		})

		await this.notificationsService.createForUser({
			userId: request.requestedBy,
			type: "approval.progressed",
			title: via === "escalate" ? "Request escalated" : "Request advanced",
			body: `Your request moved to approval step ${nextStep.stepOrder}.`,
		})

		await this.auditService.record({
			actorId: input.actorId,
			action: via === "escalate" ? "approval.request.escalated" : "approval.step.approved",
			module: AUDIT_MODULE,
			entityType: "approval_request",
			entityId: request.id,
			metadata: {
				fromStepOrder: request.currentStepOrder,
				toStepOrder: nextStep.stepOrder,
				note: input.note ?? null,
			},
		})
	}

	private async sideEffectsDelegate(
		input: ActOnRequestInput,
		request: ApprovalRequestRow,
		currentStep: ApprovalStepRow
	): Promise<void> {
		if (input.delegateToUserId) {
			await this.notificationsService.createForUser({
				userId: input.delegateToUserId,
				type: "approval.delegated",
				title: "Approval delegated to you",
				body: `An approval at step ${currentStep.stepOrder} was delegated to you${
					input.note ? `: ${input.note}` : "."
				}`,
			})
		}

		await this.auditService.record({
			actorId: input.actorId,
			action: "approval.request.delegated",
			module: AUDIT_MODULE,
			entityType: "approval_request",
			entityId: request.id,
			metadata: {
				stepOrder: currentStep.stepOrder,
				delegateToUserId: input.delegateToUserId ?? null,
				note: input.note ?? null,
			},
		})
	}

	private async notifyStepApprovers(
		step: ApprovalStepRow,
		divisionId: number | null,
		request: ApprovalRequestRow,
		notification: { type: string; title: string; body: string; excludeUserId?: string }
	): Promise<void> {
		const approverIds = await this.eligibleApproverIds(step.approverRoleId, divisionId)
		for (const userId of approverIds) {
			if (notification.excludeUserId && userId === notification.excludeUserId) continue
			await this.notificationsService.createForUser({
				userId,
				type: notification.type,
				title: notification.title,
				body: notification.body,
				linkPath: `/approvals/requests/${request.id}`,
			})
		}
	}

	private async assertUserExists(userId: string | null | undefined): Promise<void> {
		if (!userId) {
			throw new ORPCError("BAD_REQUEST", { message: "A delegate target user is required" })
		}
		const [row] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId))
		if (!row) {
			throw new ORPCError("NOT_FOUND", { message: `User ${userId} not found` })
		}
	}

	private async loadSteps(workflowId: number): Promise<ApprovalStepRow[]> {
		return db
			.select()
			.from(approvalSteps)
			.where(eq(approvalSteps.workflowId, workflowId))
			.orderBy(asc(approvalSteps.stepOrder))
	}
}
