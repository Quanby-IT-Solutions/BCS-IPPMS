import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { and, asc, eq, inArray, type SQL } from "drizzle-orm"

import {
	type ApprovalWorkflowDetail,
	type ApprovalWorkflowSummary,
	type CreateApprovalWorkflowInput,
	type ListWorkflowsQuery,
	type UpdateApprovalWorkflowInput,
} from "@repo/contracts"
import {
	approvalRequests,
	approvalSteps,
	approvalWorkflows,
	divisions,
	roles,
} from "@repo/db/schema"

import { AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"

/** Owning module label recorded on workflow audit events. */
const AUDIT_MODULE = "approvals"

@Injectable()
export class ApprovalWorkflowsService {
	constructor(private readonly auditService: AuditService) {}

	// ==========================================================================
	// READ
	// ==========================================================================
	async list(query: ListWorkflowsQuery): Promise<ApprovalWorkflowSummary[]> {
		const conditions: SQL[] = []
		if (query.module) conditions.push(eq(approvalWorkflows.module, query.module))
		if (query.divisionId) conditions.push(eq(approvalWorkflows.divisionId, query.divisionId))

		const rows = await db
			.select({
				workflow: approvalWorkflows,
				divisionName: divisions.name,
			})
			.from(approvalWorkflows)
			.leftJoin(divisions, eq(approvalWorkflows.divisionId, divisions.id))
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(asc(approvalWorkflows.module), asc(approvalWorkflows.divisionId))

		if (rows.length === 0) return []

		const counts = await this.stepCounts(rows.map(row => row.workflow.id))

		return rows.map(row => ({
			id: row.workflow.id,
			module: row.workflow.module,
			divisionId: row.workflow.divisionId,
			divisionName: row.divisionName ?? null,
			isActive: row.workflow.isActive,
			stepCount: counts.get(row.workflow.id) ?? 0,
			createdAt: row.workflow.createdAt,
			updatedAt: row.workflow.updatedAt,
		}))
	}

	async get(id: number): Promise<ApprovalWorkflowDetail> {
		return this.buildDetail(id)
	}

	// ==========================================================================
	// WRITE
	// ==========================================================================
	async create(
		payload: CreateApprovalWorkflowInput,
		actorId: string | null
	): Promise<ApprovalWorkflowDetail> {
		await this.assertDivisionExists(payload.divisionId)
		await this.assertRolesExist(payload.steps.map(step => step.approverRoleId))

		const [existing] = await db
			.select({ id: approvalWorkflows.id })
			.from(approvalWorkflows)
			.where(
				and(
					eq(approvalWorkflows.module, payload.module),
					eq(approvalWorkflows.divisionId, payload.divisionId)
				)
			)
		if (existing) {
			throw new ORPCError("CONFLICT", {
				message: `A workflow for "${payload.module}" already exists in this division`,
			})
		}

		const workflowId = await db.transaction(async tx => {
			const [workflow] = await tx
				.insert(approvalWorkflows)
				.values({
					module: payload.module,
					divisionId: payload.divisionId,
					isActive: payload.isActive ?? true,
				})
				.returning()

			if (!workflow) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Workflow could not be created" })
			}

			await tx.insert(approvalSteps).values(
				payload.steps.map((step, index) => ({
					workflowId: workflow.id,
					stepOrder: index + 1,
					approverRoleId: step.approverRoleId,
				}))
			)

			return workflow.id
		})

		await this.auditService.record({
			actorId,
			action: "approval.workflow.created",
			module: AUDIT_MODULE,
			entityType: "approval_workflow",
			entityId: workflowId,
			metadata: {
				module: payload.module,
				divisionId: payload.divisionId,
				stepCount: payload.steps.length,
			},
		})

		return this.buildDetail(workflowId)
	}

	async update(
		payload: UpdateApprovalWorkflowInput,
		actorId: string | null
	): Promise<ApprovalWorkflowDetail> {
		const current = await this.getRowOrThrow(payload.id)

		if (payload.steps) {
			// In-flight requests are routed against the existing ordered chain.
			// Replacing the chain while requests are pending would change the steps
			// of work already in progress, so block it until they complete.
			// (isActive-only updates are still allowed below: they only gate future
			// submissions and do not affect acting on existing requests.)
			const [pending] = await db
				.select({ id: approvalRequests.id })
				.from(approvalRequests)
				.where(
					and(eq(approvalRequests.workflowId, current.id), eq(approvalRequests.status, "pending"))
				)
			if (pending) {
				throw new ORPCError("CONFLICT", {
					message:
						"This workflow has pending approval requests; its step chain cannot be replaced until they complete. You can still toggle isActive.",
				})
			}

			await this.assertRolesExist(payload.steps.map(step => step.approverRoleId))
		}

		await db.transaction(async tx => {
			await tx
				.update(approvalWorkflows)
				.set({
					isActive: payload.isActive ?? current.isActive,
					updatedAt: new Date(),
				})
				.where(eq(approvalWorkflows.id, current.id))

			if (payload.steps) {
				// Replace the entire ordered chain.
				await tx.delete(approvalSteps).where(eq(approvalSteps.workflowId, current.id))
				await tx.insert(approvalSteps).values(
					payload.steps.map((step, index) => ({
						workflowId: current.id,
						stepOrder: index + 1,
						approverRoleId: step.approverRoleId,
					}))
				)
			}
		})

		await this.auditService.record({
			actorId,
			action: "approval.workflow.updated",
			module: AUDIT_MODULE,
			entityType: "approval_workflow",
			entityId: current.id,
			metadata: {
				isActive: payload.isActive ?? current.isActive,
				stepsReplaced: Boolean(payload.steps),
			},
		})

		return this.buildDetail(current.id)
	}

	async delete(id: number, actorId: string | null): Promise<{ id: number; deleted: true }> {
		const current = await this.getRowOrThrow(id)

		// Block deletion while pending requests still reference the chain
		// (approval_requests.workflowId uses onDelete: restrict).
		const [pending] = await db
			.select({ id: approvalRequests.id })
			.from(approvalRequests)
			.where(and(eq(approvalRequests.workflowId, id), eq(approvalRequests.status, "pending")))
		if (pending) {
			throw new ORPCError("CONFLICT", {
				message: "Cannot delete a workflow with pending approval requests",
			})
		}

		await db.delete(approvalWorkflows).where(eq(approvalWorkflows.id, current.id))

		await this.auditService.record({
			actorId,
			action: "approval.workflow.deleted",
			module: AUDIT_MODULE,
			entityType: "approval_workflow",
			entityId: current.id,
			metadata: { module: current.module, divisionId: current.divisionId },
		})

		return { id: current.id, deleted: true }
	}

	// ==========================================================================
	// HELPERS
	// ==========================================================================
	private async buildDetail(id: number): Promise<ApprovalWorkflowDetail> {
		const [row] = await db
			.select({ workflow: approvalWorkflows, divisionName: divisions.name })
			.from(approvalWorkflows)
			.leftJoin(divisions, eq(approvalWorkflows.divisionId, divisions.id))
			.where(eq(approvalWorkflows.id, id))

		if (!row) {
			throw new ORPCError("NOT_FOUND", { message: `Workflow with ID ${id} not found` })
		}

		const stepRows = await db
			.select({
				step: approvalSteps,
				roleName: roles.name,
			})
			.from(approvalSteps)
			.leftJoin(roles, eq(approvalSteps.approverRoleId, roles.id))
			.where(eq(approvalSteps.workflowId, id))
			.orderBy(asc(approvalSteps.stepOrder))

		return {
			id: row.workflow.id,
			module: row.workflow.module,
			divisionId: row.workflow.divisionId,
			divisionName: row.divisionName ?? null,
			isActive: row.workflow.isActive,
			stepCount: stepRows.length,
			createdAt: row.workflow.createdAt,
			updatedAt: row.workflow.updatedAt,
			steps: stepRows.map(item => ({
				id: item.step.id,
				workflowId: item.step.workflowId,
				stepOrder: item.step.stepOrder,
				approverRoleId: item.step.approverRoleId,
				approverRoleName: item.roleName ?? null,
			})),
		}
	}

	private async stepCounts(workflowIds: number[]): Promise<Map<number, number>> {
		const rows = await db
			.select({ workflowId: approvalSteps.workflowId })
			.from(approvalSteps)
			.where(inArray(approvalSteps.workflowId, workflowIds))

		const counts = new Map<number, number>()
		for (const row of rows) {
			counts.set(row.workflowId, (counts.get(row.workflowId) ?? 0) + 1)
		}
		return counts
	}

	private async getRowOrThrow(id: number) {
		const [row] = await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.id, id))
		if (!row) {
			throw new ORPCError("NOT_FOUND", { message: `Workflow with ID ${id} not found` })
		}
		return row
	}

	private async assertDivisionExists(divisionId: number): Promise<void> {
		const [row] = await db
			.select({ id: divisions.id })
			.from(divisions)
			.where(eq(divisions.id, divisionId))
		if (!row) {
			throw new ORPCError("NOT_FOUND", { message: `Division ${divisionId} not found` })
		}
	}

	private async assertRolesExist(roleIds: number[]): Promise<void> {
		const unique = [...new Set(roleIds)]
		const rows = await db.select({ id: roles.id }).from(roles).where(inArray(roles.id, unique))
		if (rows.length !== unique.length) {
			const found = new Set(rows.map(row => row.id))
			const missing = unique.filter(id => !found.has(id))
			throw new ORPCError("NOT_FOUND", { message: `Role(s) not found: ${missing.join(", ")}` })
		}
	}
}
