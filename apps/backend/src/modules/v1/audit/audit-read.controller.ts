import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { AuditReadService } from "./audit-read.service"

/**
 * Audit log read controller (oRPC). Read-only; audit records are never mutated
 * here. Listing requires `audit:read`.
 */
@Controller()
export class AuditReadController {
	constructor(private readonly auditReadService: AuditReadService) {}

	@RequirePermissions("audit:read")
	@Implement(v1.audit.list)
	async list() {
		return implement(v1.audit.list).handler(async ({ input }) => {
			return this.auditReadService.list(input)
		})
	}
}
