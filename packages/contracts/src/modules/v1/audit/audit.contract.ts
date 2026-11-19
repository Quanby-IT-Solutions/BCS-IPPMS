import { oc } from "@orpc/contract"

import { ListAuditLogsQuerySchema, ListAuditLogsResponseSchema } from "./audit.schema.js"

/**
 * Audit log read contract. Listing requires `audit:read`. CSV export
 * (`GET /audit-logs/export`) is served by a dedicated download controller and
 * requires `audit:export`; it is intentionally not part of this oRPC surface
 * since it streams a file rather than JSON. Audit records are immutable here —
 * the only write path is the backend AuditService.
 */
export const auditContract = {
	list: oc
		.route({
			method: "GET",
			path: "/audit-logs",
			summary: "List audit logs",
			description:
				"List audit logs filtered by date range, actor, module, entity type/id, with pagination.",
			tags: ["Audit"],
		})
		.input(ListAuditLogsQuerySchema)
		.output(ListAuditLogsResponseSchema),
}
