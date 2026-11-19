import { Controller, Get, Query, Res } from "@nestjs/common"
import type { Response } from "express"

import { ListAuditLogsQuerySchema, type AuditLog } from "@repo/contracts"

import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { AuditReadService } from "./audit-read.service"

const CSV_COLUMNS = [
	"id",
	"actorId",
	"action",
	"module",
	"entityType",
	"entityId",
	"metadata",
	"createdAt",
] as const

/**
 * Escape a CSV cell. Quotes values containing delimiters/quotes/newlines and
 * neutralizes spreadsheet formula injection by prefixing leading =, +, -, @.
 */
function csvEscape(value: unknown): string {
	if (value === null || value === undefined) return ""
	let str = typeof value === "object" ? JSON.stringify(value) : String(value)
	if (/^[=+\-@]/.test(str)) {
		str = `'${str}`
	}
	if (/[",\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`
	}
	return str
}

function toCsv(rows: AuditLog[]): string {
	const lines = [CSV_COLUMNS.join(",")]
	for (const row of rows) {
		lines.push(
			[
				row.id,
				row.actorId,
				row.action,
				row.module,
				row.entityType,
				row.entityId,
				row.metadata,
				row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
			]
				.map(csvEscape)
				.join(",")
		)
	}
	return lines.join("\r\n")
}

/**
 * Audit log CSV export (plain NestJS route — streams a file, not JSON).
 * Versioned to `/api/v1/audit-logs/export`. Requires `audit:export`.
 */
@Controller({ path: "audit-logs", version: "1" })
export class AuditExportController {
	constructor(private readonly auditReadService: AuditReadService) {}

	@RequirePermissions("audit:export")
	@Get("export")
	async export(
		@Query() query: Record<string, unknown>,
		@Res({ passthrough: false }) res: Response
	) {
		// Reuse the contract schema so filters coerce/validate identically to the
		// oRPC list endpoint.
		const filters = ListAuditLogsQuerySchema.parse(query)
		const rows = await this.auditReadService.exportRows(filters)

		res.setHeader("Content-Type", "text/csv; charset=utf-8")
		res.setHeader("Content-Disposition", 'attachment; filename="audit-logs.csv"')
		res.send(toCsv(rows))
	}
}
