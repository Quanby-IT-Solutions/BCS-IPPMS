import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { ApprovalWorkflowsService } from "./approval-workflows.service"

/**
 * Approval workflow builder controller (oRPC). CRUD over workflow chains keyed
 * by module + division. Guarded by the `approval-workflows:*` permission family.
 */
@Controller()
export class ApprovalWorkflowsController {
	constructor(private readonly workflowsService: ApprovalWorkflowsService) {}

	@RequirePermissions("approval-workflows:read")
	@Implement(v1.approval.workflows.list)
	async list() {
		return implement(v1.approval.workflows.list).handler(async ({ input }) => {
			return this.workflowsService.list(input)
		})
	}

	@RequirePermissions("approval-workflows:read")
	@Implement(v1.approval.workflows.get)
	async get() {
		return implement(v1.approval.workflows.get).handler(async ({ input }) => {
			return this.workflowsService.get(input.id)
		})
	}

	@RequirePermissions("approval-workflows:create")
	@Implement(v1.approval.workflows.create)
	async create(@Session() session?: UserSession) {
		return implement(v1.approval.workflows.create).handler(async ({ input }) => {
			return this.workflowsService.create(input, session?.user?.id ?? null)
		})
	}

	@RequirePermissions("approval-workflows:update")
	@Implement(v1.approval.workflows.update)
	async update(@Session() session?: UserSession) {
		return implement(v1.approval.workflows.update).handler(async ({ input }) => {
			return this.workflowsService.update(input, session?.user?.id ?? null)
		})
	}

	@RequirePermissions("approval-workflows:delete")
	@Implement(v1.approval.workflows.delete)
	async delete(@Session() session?: UserSession) {
		return implement(v1.approval.workflows.delete).handler(async ({ input }) => {
			return this.workflowsService.delete(input.id, session?.user?.id ?? null)
		})
	}
}
