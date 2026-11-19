import { Module } from "@nestjs/common"

import { env } from "@/config/env.config"

import { ApprovalsModule } from "./approvals/approvals.module"
import { AuditReadModule } from "./audit/audit.module"
import { DiagnosticsModule } from "./diagnostics/diagnostics.module"
import { DivisionsModule } from "./divisions/divisions.module"
import { ExamplesModule } from "./examples/examples.module"
import { FilesModule } from "./files/files.module"
import { HealthModule } from "./health/health.module"
import { MeModule } from "./me/me.module"
import { NotificationsModule } from "./notifications/notifications.module"
import { ProjectsModule } from "./projects/projects.module"
import { RbacAdminModule } from "./rbac/rbac.module"
import { ReportsModule } from "./reports/reports.module"
import { TicketsModule } from "./tickets/tickets.module"

@Module({
	imports: [
		ApprovalsModule,
		AuditReadModule,
		DivisionsModule,
		ExamplesModule,
		FilesModule,
		HealthModule,
		MeModule,
		NotificationsModule,
		ProjectsModule,
		RbacAdminModule,
		ReportsModule,
		TicketsModule,
		// Sentry diagnostics exist ONLY in development. Conditional import rather
		// than a runtime guard on the handler: the routes are then absent from the
		// router entirely (404), so there is no guard to misconfigure and no
		// deliberate-error endpoint sitting in a production build.
		...(env.NODE_ENV === "development" ? [DiagnosticsModule] : []),
	],
})
export class V1Module {}
