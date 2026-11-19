import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { and, count, desc, eq, gte, lte, type SQL } from "drizzle-orm"

import {
	type ReportFilters,
	type ReportParams,
	type ReportPreview,
	type ReportSummaryItem,
	type ReportType,
} from "@repo/contracts"
import { auditLogs, projects, projectTasks } from "@repo/db/schema"

import { AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"
import {
	DivisionScopeService,
	type DivisionAccessContext,
} from "@/common/division-scope/division-scope.service"

/** Owning module label recorded on report audit events. */
const AUDIT_MODULE = "reports"

/** Default number of sample rows returned in a JSON preview. */
const DEFAULT_PREVIEW_LIMIT = 100

/** Hard cap on rows materialized for a single export download. */
const EXPORT_LIMIT = 10_000

/**
 * A fully-resolved report ready for JSON preview or file export. `rows` are
 * pre-stringified `string[][]` so every formatter (CSV/Excel/PDF) consumes one
 * shape. `totalRows` is the full scoped count even when `rows` is truncated.
 */
export interface ReportDataset {
	type: ReportType
	title: string
	generatedAt: Date
	filters: ReportFilters
	summary: ReportSummaryItem[]
	columns: string[]
	rows: string[][]
	totalRows: number
}

/** Stringify a DB value into a report cell. */
function cell(value: unknown): string {
	if (value === null || value === undefined) return ""
	if (value instanceof Date) return value.toISOString()
	return String(value)
}

/**
 * Division-scoped report generation (Tech Plan §3). Produces operational
 * summaries for projects, tasks, and the audit trail. Scoping follows the
 * shared {@link DivisionScopeService} contract: Admin sees all; a scoped user
 * sees only their own division; a non-admin without a division gets no rows.
 *
 * The audit trail has no division column, so `audit_summary` is scoped by
 * actor instead: Admin sees every actor, a non-admin sees only their own
 * actions (fail-closed, no cross-user leak).
 */
@Injectable()
export class ReportsService {
	constructor(
		private readonly divisionScope: DivisionScopeService,
		private readonly auditService: AuditService
	) {}

	/** Build the JSON preview (truncated sample rows) and audit the access. */
	async preview(userId: string, params: ReportParams): Promise<ReportPreview> {
		const limit = params.limit ?? DEFAULT_PREVIEW_LIMIT
		const dataset = await this.build(userId, params, limit)

		await this.auditService.record({
			actorId: userId,
			action: "report.previewed",
			module: AUDIT_MODULE,
			entityType: "report",
			entityId: params.type,
			metadata: { type: params.type, filters: this.serializeFilters(dataset.filters) },
		})

		return {
			type: dataset.type,
			title: dataset.title,
			generatedAt: dataset.generatedAt,
			filters: dataset.filters,
			summary: dataset.summary,
			columns: dataset.columns,
			rows: dataset.rows,
			totalRows: dataset.totalRows,
		}
	}

	/** Build the full dataset for a file export and audit the generation. */
	async generate(userId: string, params: ReportParams, format: string): Promise<ReportDataset> {
		const dataset = await this.build(userId, params, EXPORT_LIMIT)

		await this.auditService.record({
			actorId: userId,
			action: "report.exported",
			module: AUDIT_MODULE,
			entityType: "report",
			entityId: params.type,
			metadata: {
				type: params.type,
				format,
				rows: dataset.totalRows,
				filters: this.serializeFilters(dataset.filters),
			},
		})

		return dataset
	}

	// ==========================================================================
	// DATASET BUILDERS
	// ==========================================================================
	private async build(
		userId: string,
		params: ReportParams,
		rowCap: number
	): Promise<ReportDataset> {
		const context = await this.divisionScope.resolveContext(userId)

		switch (params.type) {
			case "project_summary":
				return this.buildProjectSummary(context, params, rowCap)
			case "task_summary":
				return this.buildTaskSummary(context, params, rowCap)
			case "audit_summary":
				return this.buildAuditSummary(context, params, rowCap)
			default:
				// Exhaustive in practice (schema-validated); fail closed otherwise.
				throw new ORPCError("BAD_REQUEST", { message: "Unsupported report type" })
		}
	}

	private async buildProjectSummary(
		context: DivisionAccessContext,
		params: ReportParams,
		rowCap: number
	): Promise<ReportDataset> {
		const conditions: SQL[] = []
		const scopeFilter = this.divisionScope.divisionFilter(context, projects.divisionId)
		if (scopeFilter) conditions.push(scopeFilter)
		if (params.from) conditions.push(gte(projects.createdAt, params.from))
		if (params.to) conditions.push(lte(projects.createdAt, params.to))
		if (params.status) conditions.push(eq(projects.status, params.status as never))
		if (context.isAdmin && params.divisionId) {
			conditions.push(eq(projects.divisionId, params.divisionId))
		}
		const where = conditions.length ? and(...conditions) : undefined

		const [rows, totalRows, byStatus] = await Promise.all([
			db.select().from(projects).where(where).orderBy(desc(projects.createdAt)).limit(rowCap),
			db
				.select({ value: count() })
				.from(projects)
				.where(where)
				.then(result => result[0]?.value ?? 0),
			db
				.select({ status: projects.status, value: count() })
				.from(projects)
				.where(where)
				.groupBy(projects.status),
		])

		return {
			type: "project_summary",
			title: "Project Summary Report",
			generatedAt: new Date(),
			filters: this.toFilters(params),
			summary: [
				...byStatus.map(item => ({ label: this.titleCase(item.status), value: item.value })),
				{ label: "Total", value: totalRows },
			],
			columns: ["ID", "Title", "Status", "Division ID", "Created By", "Created At"],
			rows: rows.map(row => [
				cell(row.id),
				cell(row.title),
				cell(row.status),
				cell(row.divisionId),
				cell(row.createdBy),
				cell(row.createdAt),
			]),
			totalRows,
		}
	}

	private async buildTaskSummary(
		context: DivisionAccessContext,
		params: ReportParams,
		rowCap: number
	): Promise<ReportDataset> {
		// Tasks carry no division column; scope via their parent project.
		const conditions: SQL[] = []
		const scopeFilter = this.divisionScope.divisionFilter(context, projects.divisionId)
		if (scopeFilter) conditions.push(scopeFilter)
		if (params.from) conditions.push(gte(projectTasks.createdAt, params.from))
		if (params.to) conditions.push(lte(projectTasks.createdAt, params.to))
		if (params.status) conditions.push(eq(projectTasks.status, params.status as never))
		if (context.isAdmin && params.divisionId) {
			conditions.push(eq(projects.divisionId, params.divisionId))
		}
		const where = conditions.length ? and(...conditions) : undefined

		const baseQuery = db
			.select({
				id: projectTasks.id,
				projectId: projectTasks.projectId,
				title: projectTasks.title,
				status: projectTasks.status,
				assigneeId: projectTasks.assigneeId,
				dueDate: projectTasks.dueDate,
				createdAt: projectTasks.createdAt,
			})
			.from(projectTasks)
			.innerJoin(projects, eq(projectTasks.projectId, projects.id))

		const [rows, totalRows, byStatus] = await Promise.all([
			baseQuery.where(where).orderBy(desc(projectTasks.createdAt)).limit(rowCap),
			db
				.select({ value: count() })
				.from(projectTasks)
				.innerJoin(projects, eq(projectTasks.projectId, projects.id))
				.where(where)
				.then(result => result[0]?.value ?? 0),
			db
				.select({ status: projectTasks.status, value: count() })
				.from(projectTasks)
				.innerJoin(projects, eq(projectTasks.projectId, projects.id))
				.where(where)
				.groupBy(projectTasks.status),
		])

		return {
			type: "task_summary",
			title: "Task Summary Report",
			generatedAt: new Date(),
			filters: this.toFilters(params),
			summary: [
				...byStatus.map(item => ({ label: this.titleCase(item.status), value: item.value })),
				{ label: "Total", value: totalRows },
			],
			columns: ["ID", "Project ID", "Title", "Status", "Assignee", "Due Date", "Created At"],
			rows: rows.map(row => [
				cell(row.id),
				cell(row.projectId),
				cell(row.title),
				cell(row.status),
				cell(row.assigneeId),
				cell(row.dueDate),
				cell(row.createdAt),
			]),
			totalRows,
		}
	}

	private async buildAuditSummary(
		context: DivisionAccessContext,
		params: ReportParams,
		rowCap: number
	): Promise<ReportDataset> {
		const conditions: SQL[] = []
		// Audit logs have no division dimension: scope non-admins to their own actions.
		if (!context.isAdmin) conditions.push(eq(auditLogs.actorId, context.userId))
		if (params.from) conditions.push(gte(auditLogs.createdAt, params.from))
		if (params.to) conditions.push(lte(auditLogs.createdAt, params.to))
		if (params.module) conditions.push(eq(auditLogs.module, params.module))
		const where = conditions.length ? and(...conditions) : undefined

		const [rows, totalRows, byModule] = await Promise.all([
			db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(rowCap),
			db
				.select({ value: count() })
				.from(auditLogs)
				.where(where)
				.then(result => result[0]?.value ?? 0),
			db
				.select({ module: auditLogs.module, value: count() })
				.from(auditLogs)
				.where(where)
				.groupBy(auditLogs.module),
		])

		return {
			type: "audit_summary",
			title: "Audit Summary Report",
			generatedAt: new Date(),
			filters: this.toFilters(params),
			summary: [
				...byModule.map(item => ({
					label: item.module ?? "(none)",
					value: item.value,
				})),
				{ label: "Total", value: totalRows },
			],
			columns: ["ID", "Actor", "Action", "Module", "Entity Type", "Entity ID", "Created At"],
			rows: rows.map(row => [
				cell(row.id),
				cell(row.actorId),
				cell(row.action),
				cell(row.module),
				cell(row.entityType),
				cell(row.entityId),
				cell(row.createdAt),
			]),
			totalRows,
		}
	}

	// ==========================================================================
	// HELPERS
	// ==========================================================================
	private toFilters(params: ReportParams): ReportFilters {
		return {
			from: params.from ?? null,
			to: params.to ?? null,
			divisionId: params.divisionId ?? null,
			status: params.status ?? null,
			module: params.module ?? null,
		}
	}

	private serializeFilters(filters: ReportFilters): Record<string, unknown> {
		return {
			from: filters.from ? filters.from.toISOString() : null,
			to: filters.to ? filters.to.toISOString() : null,
			divisionId: filters.divisionId,
			status: filters.status,
			module: filters.module,
		}
	}

	private titleCase(value: string): string {
		return value
			.split("_")
			.map(part => (part.length ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
			.join(" ")
	}
}
