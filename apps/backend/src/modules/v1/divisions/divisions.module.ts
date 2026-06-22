import { Module } from "@nestjs/common"

import { AuditModule } from "@/common/audit/audit.module"
import { RbacModule } from "@/common/rbac/rbac.module"

import { DivisionsController } from "./divisions.controller"
import { DivisionsService } from "./divisions.service"

@Module({
	imports: [AuditModule, RbacModule],
	controllers: [DivisionsController],
	providers: [DivisionsService],
})
export class DivisionsModule {}
