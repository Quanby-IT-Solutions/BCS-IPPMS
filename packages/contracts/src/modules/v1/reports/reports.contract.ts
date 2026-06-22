import { oc } from "@orpc/contract"

import { ReportParamsSchema, ReportPreviewSchema } from "./reports.schema.js"

/**
 * Reports contract. The JSON preview (`GET /reports/preview`) returns a
 * division-scoped operational summary and requires `reports:read`. File
 * exports (`GET /reports/export`, CSV/Excel/PDF) are served by a dedicated
 * download controller and require `reports:export`; they are intentionally not
 * part of this oRPC surface since they stream a file rather than JSON.
 *
 * All endpoints are division-scoped server-side: Admin sees all divisions; a
 * scoped user sees only their own division; a non-admin without a division is
 * fail-closed (no rows).
 */
export const reportsContract = {
	preview: oc
		.route({
			method: "GET",
			path: "/reports/preview",
			summary: "Preview a report",
			description:
				"Generate a lightweight, division-scoped JSON preview (summary metrics + sample rows) for a report type, filtered by date range, division, status, or module.",
			tags: ["Reports"],
		})
		.input(ReportParamsSchema)
		.output(ReportPreviewSchema),
}
