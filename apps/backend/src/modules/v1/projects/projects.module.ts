import { Module } from "@nestjs/common"

import { ApprovalEngineModule } from "@/common/approval/approval-engine.module"
import { AuditModule } from "@/common/audit/audit.module"
import { DivisionScopeModule } from "@/common/division-scope/division-scope.module"
import { RbacModule } from "@/common/rbac/rbac.module"
import { NotificationsModule } from "@/modules/v1/notifications/notifications.module"

import { ProjectClosuresController } from "./project-closures.controller"
import { ProjectClosuresService } from "./project-closures.service"
import { ProjectMilestonesController } from "./project-milestones.controller"
import { ProjectMilestonesService } from "./project-milestones.service"
import { ProjectTasksController } from "./project-tasks.controller"
import { ProjectTasksService } from "./project-tasks.service"
import { ProjectsController } from "./projects.controller"
import { ProjectsService } from "./projects.service"

/**
 * Project lifecycle feature module: proposal/conceptualization, schedule
 * (milestones), task delegation, execution/progress, and closure.
 *
 * Submission routes proposals through the reusable {@link ApprovalEngineModule};
 * row-level division segregation comes from {@link DivisionScopeModule}; key
 * events emit audit records and notifications.
 */
@Module({
	imports: [
		ApprovalEngineModule,
		AuditModule,
		DivisionScopeModule,
		NotificationsModule,
		RbacModule,
	],
	controllers: [
		ProjectsController,
		ProjectTasksController,
		ProjectMilestonesController,
		ProjectClosuresController,
	],
	providers: [
		ProjectsService,
		ProjectTasksService,
		ProjectMilestonesService,
		ProjectClosuresService,
	],
})
export class ProjectsModule {}
