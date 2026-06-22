import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { ApprovalRequestsService } from "./approval-requests.service"

/**
 * Approval requests controller (oRPC). Exposes the "My Approvals" inbox, the
 * request status tracker, and the act endpoint. Reads require
 * `approval-requests:read`; acting is additionally gated by role-step
 * eligibility inside the ApprovalEngineService and records an
 * `approval-actions:*` event.
 */
@Controller()
export class ApprovalRequestsController {
	constructor(private readonly requestsService: ApprovalRequestsService) {}

	@RequirePermissions("approval-requests:read")
	@Implement(v1.approval.requests.inbox)
	async inbox(@Session() session: UserSession) {
		return implement(v1.approval.requests.inbox).handler(async () => {
			return this.requestsService.inbox(session.user.id)
		})
	}

	@RequirePermissions("approval-requests:read")
	@Implement(v1.approval.requests.get)
	async get(@Session() session: UserSession) {
		return implement(v1.approval.requests.get).handler(async ({ input }) => {
			return this.requestsService.getDetail(input.id, session.user.id)
		})
	}

	@RequirePermissions("approval-requests:read")
	@Implement(v1.approval.requests.act)
	async act(@Session() session: UserSession) {
		return implement(v1.approval.requests.act).handler(async ({ input }) => {
			return this.requestsService.act(session.user.id, input)
		})
	}
}
