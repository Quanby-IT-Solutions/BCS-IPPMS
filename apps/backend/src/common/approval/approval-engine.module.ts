import { Module } from "@nestjs/common"

import { AuditModule } from "@/common/audit/audit.module"
import { RbacModule } from "@/common/rbac/rbac.module"
import { NotificationsModule } from "@/modules/v1/notifications/notifications.module"

import { ApprovalEngineService } from "./approval-engine.service"

/**
 * Provides the reusable {@link ApprovalEngineService}. Feature modules import
 * this to open and progress approval requests. Depends on Audit (semantic
 * events), Notifications (approver/requester alerts), and RBAC (Admin bypass +
 * role-step eligibility).
 */
@Module({
	imports: [AuditModule, RbacModule, NotificationsModule],
	providers: [ApprovalEngineService],
	exports: [ApprovalEngineService],
})
export class ApprovalEngineModule {}
