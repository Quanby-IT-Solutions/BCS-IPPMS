import { Module } from "@nestjs/common"

import { AuditExportController } from "./audit-export.controller"
import { AuditReadController } from "./audit-read.controller"
import { AuditReadService } from "./audit-read.service"

/**
 * Audit log read/export feature module. Distinct from the cross-cutting
 * `@/common/audit` module (which provides the write-path AuditService).
 */
@Module({
	controllers: [AuditReadController, AuditExportController],
	providers: [AuditReadService],
	exports: [AuditReadService],
})
export class AuditReadModule {}
