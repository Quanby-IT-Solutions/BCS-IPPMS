import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	ActOnRequestSchema,
	ApprovalRequestDetailSchema,
	ApprovalRequestSummarySchema,
	ApprovalWorkflowDetailSchema,
	ApprovalWorkflowSummarySchema,
	CreateApprovalWorkflowSchema,
	DeleteWorkflowResponseSchema,
	ListWorkflowsQuerySchema,
	RequestIdSchema,
	UpdateApprovalWorkflowSchema,
	WorkflowIdSchema,
} from "./approvals.schema.js"

/**
 * Generic approval engine contract — workflow builder + "My Approvals" inbox.
 *
 * Workflow CRUD requires the `approval-workflows:*` permission family. Inbox
 * and request reads require `approval-requests:read`. Acting on a request is
 * additionally gated by role-step eligibility in the backend engine (the actor
 * must hold the current step's role within the request's division, or be
 * Admin) and records an `approval-actions:*` event. All enforced server-side by
 * the RbacGuard + ApprovalEngineService.
 */
export const approvalsContract = {
	// ---- Workflow builder --------------------------------------------------
	workflows: {
		list: oc
			.route({
				method: "GET",
				path: "/approvals/workflows",
				summary: "List approval workflows",
				description: "List approval workflow chains, optionally filtered by module/division.",
				tags: ["Approvals"],
			})
			.input(ListWorkflowsQuerySchema)
			.output(z.array(ApprovalWorkflowSummarySchema)),

		get: oc
			.route({
				method: "GET",
				path: "/approvals/workflows/{id}",
				summary: "Get approval workflow",
				description: "Get a single workflow chain with its ordered role steps.",
				tags: ["Approvals"],
			})
			.input(WorkflowIdSchema)
			.output(ApprovalWorkflowDetailSchema),

		create: oc
			.route({
				method: "POST",
				path: "/approvals/workflows",
				summary: "Create approval workflow",
				description: "Create a workflow chain keyed by module + division with ordered role steps.",
				tags: ["Approvals"],
			})
			.input(CreateApprovalWorkflowSchema)
			.output(ApprovalWorkflowDetailSchema),

		update: oc
			.route({
				method: "PUT",
				path: "/approvals/workflows/{id}",
				summary: "Update approval workflow",
				description: "Toggle active state and/or replace the ordered role-step chain.",
				tags: ["Approvals"],
			})
			.input(UpdateApprovalWorkflowSchema)
			.output(ApprovalWorkflowDetailSchema),

		delete: oc
			.route({
				method: "DELETE",
				path: "/approvals/workflows/{id}",
				summary: "Delete approval workflow",
				description: "Delete a workflow chain and its steps.",
				tags: ["Approvals"],
			})
			.input(WorkflowIdSchema)
			.output(DeleteWorkflowResponseSchema),
	},

	// ---- Requests: inbox, detail/status tracker, actions -------------------
	requests: {
		inbox: oc
			.route({
				method: "GET",
				path: "/approvals/requests/inbox",
				summary: "My approvals inbox",
				description: "List pending requests the current user is eligible to act on.",
				tags: ["Approvals"],
			})
			.output(z.array(ApprovalRequestSummarySchema)),

		get: oc
			.route({
				method: "GET",
				path: "/approvals/requests/{id}",
				summary: "Get approval request",
				description: "Get a request with its chain and action history (status tracker).",
				tags: ["Approvals"],
			})
			.input(RequestIdSchema)
			.output(ApprovalRequestDetailSchema),

		act: oc
			.route({
				method: "POST",
				path: "/approvals/requests/{id}/actions",
				summary: "Act on approval request",
				description: "Approve, reject, delegate, or escalate a pending request.",
				tags: ["Approvals"],
			})
			.input(ActOnRequestSchema)
			.output(ApprovalRequestDetailSchema),
	},
}
