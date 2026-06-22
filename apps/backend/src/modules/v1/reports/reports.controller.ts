import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { ReportsService } from "./reports.service"

/**
 * Reports preview controller (oRPC, JSON). Division-scoped via the service
 * layer. Preview requires `reports:read`; the heavier `reports:generate` and
 * `reports:export` permissions gate the file-download controller.
 */
@Controller()
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	@RequirePermissions("reports:read")
	@Implement(v1.report.preview)
	async preview(@Session() session: UserSession) {
		return implement(v1.report.preview).handler(async ({ input }) => {
			return this.reportsService.preview(session.user.id, input)
		})
	}
}
