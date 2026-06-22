import { z } from "zod"

// ============================================================================
// SHARED
// ============================================================================
const dateField = z
	.union([z.date(), z.string()])
	.transform(val => (typeof val === "string" ? new Date(val) : val))

// ============================================================================
// REPORTS — types, formats, parameters
// ============================================================================

/**
 * Supported operational report types. Each maps to a division-scoped query in
 * the backend ReportsService:
 * - `project_summary` — projects grouped by status (filterable by status).
 * - `task_summary` — project tasks grouped by status (filterable by status).
 * - `audit_summary` — audit-log activity grouped by module (filterable by module).
 */
export const ReportTypeSchema = z.enum(["project_summary", "task_summary", "audit_summary"])

/** Export output formats. CSV/Excel/PDF are streamed as downloads. */
export const ReportFormatSchema = z.enum(["csv", "excel", "pdf"])

/**
 * Parameters for report preview/generation. `from`/`to` bound the relevant
 * timestamp; `divisionId` lets an Admin narrow to a single division (scoped
 * users are always restricted to their own division server-side). `status`
 * applies to project/task reports, `module` to the audit report. `limit` caps
 * the preview row count (exports use a separate, larger server-side cap).
 */
export const ReportParamsSchema = z.object({
	type: ReportTypeSchema,
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
	divisionId: z.coerce.number().int().positive().optional(),
	status: z.string().min(1).max(50).optional(),
	module: z.string().min(1).max(100).optional(),
	limit: z.coerce.number().int().positive().max(500).optional(),
})

/** Export query: report params plus the requested output format. */
export const ReportExportQuerySchema = ReportParamsSchema.extend({
	format: ReportFormatSchema,
})

// ============================================================================
// REPORT PREVIEW (JSON)
// ============================================================================

/** A single labelled summary metric (e.g. "Active" → 12). */
export const ReportSummaryItemSchema = z.object({
	label: z.string(),
	value: z.number().int().nonnegative(),
})

/** Echo of the resolved filters used to build the report. */
export const ReportFiltersSchema = z.object({
	from: dateField.nullable(),
	to: dateField.nullable(),
	divisionId: z.number().int().positive().nullable(),
	status: z.string().nullable(),
	module: z.string().nullable(),
})

/**
 * Lightweight JSON preview of a generated report. `summary` holds aggregate
 * counts; `columns`/`rows` are a truncated tabular sample (full data is only
 * materialized for downloads). `totalRows` is the full scoped row count.
 */
export const ReportPreviewSchema = z.object({
	type: ReportTypeSchema,
	title: z.string(),
	generatedAt: dateField,
	filters: ReportFiltersSchema,
	summary: z.array(ReportSummaryItemSchema),
	columns: z.array(z.string()),
	rows: z.array(z.array(z.string())),
	totalRows: z.number().int().nonnegative(),
})

// ============================================================================
// TYPES
// ============================================================================
export type ReportType = z.infer<typeof ReportTypeSchema>
export type ReportFormat = z.infer<typeof ReportFormatSchema>
export type ReportParams = z.infer<typeof ReportParamsSchema>
export type ReportExportQuery = z.infer<typeof ReportExportQuerySchema>
export type ReportSummaryItem = z.infer<typeof ReportSummaryItemSchema>
export type ReportFilters = z.infer<typeof ReportFiltersSchema>
export type ReportPreview = z.infer<typeof ReportPreviewSchema>
