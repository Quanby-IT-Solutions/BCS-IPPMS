import { oc } from "@orpc/contract"

import { approvalsContract } from "./approvals/approvals.contract.js"
import { auditContract } from "./audit/audit.contract.js"
import { divisionsContract } from "./divisions/divisions.contract.js"
import { v1Example } from "./examples/v1.example.js"
import { filesContract } from "./files/files.contract.js"
import { healthContract } from "./health/health.contract.js"
import { meContract } from "./me/me.contract.js"
import { notificationsContract } from "./notifications/notifications.contract.js"
import { projectsContract } from "./projects/projects.contract.js"
import { rbacContract } from "./rbac/rbac.contract.js"
import { reportsContract } from "./reports/reports.contract.js"
import { ticketContract } from "./tickets/tickets.contract.js"

/**
 * V1 contract router (versioned paths: /v1/todos, /v1/health, /v1/tickets)
 * Assembles all v1 feature contracts and applies the /v1 prefix
 */
export const v1Contract = oc.prefix("/v1").router(
	oc.router({
		health: healthContract,
		example: v1Example,
		me: meContract,
		division: divisionsContract,
		rbac: rbacContract,
		ticket: ticketContract,
		file: filesContract,
		notification: notificationsContract,
		audit: auditContract,
		approval: approvalsContract,
		project: projectsContract,
		report: reportsContract,
	})
)

export type V1Contract = typeof v1Contract
