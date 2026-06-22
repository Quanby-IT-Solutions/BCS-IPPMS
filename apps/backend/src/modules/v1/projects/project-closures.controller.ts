import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { ProjectClosuresService } from "./project-closures.service"

/** Project closure / evaluation controller (oRPC). */
@Controller()
export class ProjectClosuresController {
	constructor(private readonly closuresService: ProjectClosuresService) {}

	@RequirePermissions("projects:close", "project-closures:create")
	@Implement(v1.project.closures.submit)
	async submit(@Session() session: UserSession) {
		return implement(v1.project.closures.submit).handler(async ({ input }) => {
			return this.closuresService.submit(session.user.id, input)
		})
	}

	@RequirePermissions("project-closures:read")
	@Implement(v1.project.closures.get)
	async get(@Session() session: UserSession) {
		return implement(v1.project.closures.get).handler(async ({ input }) => {
			return this.closuresService.get(session.user.id, input.projectId)
		})
	}
}
