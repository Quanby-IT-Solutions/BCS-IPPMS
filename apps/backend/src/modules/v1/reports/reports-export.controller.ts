import { Controller, Get, Query, Res } from "@nestjs/common"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Response } from "express"

import { ReportExportQuerySchema } from "@repo/contracts"

import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { renderReport } from "./report-formatters"
import { ReportsService } from "./reports.service"

/**
 * Report export (plain NestJS route — streams a CSV/Excel/PDF file, not JSON).
 * Versioned to `/api/v1/reports/export`. Requires `reports:export`. Data is
 * division-scoped in the service exactly like the JSON preview.
 */
@Controller({ path: "reports", version: "1" })
export class ReportsExportController {
	constructor(private readonly reportsService: ReportsService) {}

	@RequirePermissions("reports:export")
	@Get("export")
	async export(
		@Query() query: Record<string, unknown>,
		@Session() session: UserSession,
		@Res({ passthrough: false }) res: Response
	) {
		// Reuse the contract schema so params coerce/validate identically to preview.
		const { format, ...params } = ReportExportQuerySchema.parse(query)
		const dataset = await this.reportsService.generate(session.user.id, params, format)
		const file = renderReport(dataset, format)

		res.setHeader("Content-Type", file.contentType)
		res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`)
		res.setHeader("Content-Length", String(file.body.length))
		res.send(file.body)
	}
}
