import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { ProjectMilestonesService } from "./project-milestones.service"

/** Project schedule / milestone controller (oRPC). */
@Controller()
export class ProjectMilestonesController {
	constructor(private readonly milestonesService: ProjectMilestonesService) {}

	@RequirePermissions("project-milestones:read")
	@Implement(v1.project.milestones.list)
	async list(@Session() session: UserSession) {
		return implement(v1.project.milestones.list).handler(async ({ input }) => {
			return this.milestonesService.list(session.user.id, input)
		})
	}

	@RequirePermissions("project-milestones:create")
	@Implement(v1.project.milestones.create)
	async create(@Session() session: UserSession) {
		return implement(v1.project.milestones.create).handler(async ({ input }) => {
			return this.milestonesService.create(session.user.id, input)
		})
	}

	@RequirePermissions("project-milestones:update")
	@Implement(v1.project.milestones.update)
	async update(@Session() session: UserSession) {
		return implement(v1.project.milestones.update).handler(async ({ input }) => {
			return this.milestonesService.update(session.user.id, input)
		})
	}

	@RequirePermissions("project-milestones:delete")
	@Implement(v1.project.milestones.delete)
	async delete(@Session() session: UserSession) {
		return implement(v1.project.milestones.delete).handler(async ({ input }) => {
			return this.milestonesService.delete(session.user.id, input.id)
		})
	}

	@RequirePermissions("project-milestones:update")
	@Implement(v1.project.milestones.setStatus)
	async setStatus(@Session() session: UserSession) {
		return implement(v1.project.milestones.setStatus).handler(async ({ input }) => {
			return this.milestonesService.setStatus(session.user.id, input)
		})
	}

	@RequirePermissions("project-milestones:update")
	@Implement(v1.project.milestones.setProgress)
	async setProgress(@Session() session: UserSession) {
		return implement(v1.project.milestones.setProgress).handler(async ({ input }) => {
			return this.milestonesService.setProgress(session.user.id, input)
		})
	}
}
