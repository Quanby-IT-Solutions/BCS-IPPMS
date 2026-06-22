import { Module } from "@nestjs/common"

import { ApprovalEngineModule } from "@/common/approval/approval-engine.module"
import { AuditModule } from "@/common/audit/audit.module"
import { RbacModule } from "@/common/rbac/rbac.module"

import { ApprovalRequestsController } from "./approval-requests.controller"
import { ApprovalRequestsService } from "./approval-requests.service"
import { ApprovalWorkflowsController } from "./approval-workflows.controller"
import { ApprovalWorkflowsService } from "./approval-workflows.service"

/**
 * Approvals feature module: workflow builder CRUD + "My Approvals" inbox.
 * Routing/eligibility logic lives in the reusable {@link ApprovalEngineModule};
 * this module owns the HTTP surface.
 */
@Module({
	imports: [ApprovalEngineModule, AuditModule, RbacModule],
	controllers: [ApprovalWorkflowsController, ApprovalRequestsController],
	providers: [ApprovalWorkflowsService, ApprovalRequestsService],
})
export class ApprovalsModule {}
