import { Module } from "@nestjs/common"

import { AuditModule } from "@/common/audit/audit.module"
import { DivisionScopeModule } from "@/common/division-scope/division-scope.module"
import { RbacModule } from "@/common/rbac/rbac.module"

import { ReportsExportController } from "./reports-export.controller"
import { ReportsController } from "./reports.controller"
import { ReportsService } from "./reports.service"

/**
 * Reports feature module: parameterized, division-scoped report preview (oRPC
 * JSON) and CSV/Excel/PDF export downloads. Row-level division segregation
 * comes from {@link DivisionScopeModule}; generation/export events emit audit
 * records via {@link AuditModule}.
 */
@Module({
	imports: [AuditModule, DivisionScopeModule, RbacModule],
	controllers: [ReportsController, ReportsExportController],
	providers: [ReportsService],
})
export class ReportsModule {}
