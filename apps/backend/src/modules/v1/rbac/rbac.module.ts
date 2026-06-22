import { Module } from "@nestjs/common"

import { AuditModule } from "@/common/audit/audit.module"
import { RbacModule } from "@/common/rbac/rbac.module"

import { RbacAdminService } from "./rbac-admin.service"
import { RbacController } from "./rbac.controller"

@Module({
	imports: [AuditModule, RbacModule],
	controllers: [RbacController],
	providers: [RbacAdminService],
})
export class RbacAdminModule {}
