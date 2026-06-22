import { Module } from "@nestjs/common"

import { ApprovalsModule } from "./approvals/approvals.module"
import { AuditReadModule } from "./audit/audit.module"
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
	],
})
export class V1Module {}
