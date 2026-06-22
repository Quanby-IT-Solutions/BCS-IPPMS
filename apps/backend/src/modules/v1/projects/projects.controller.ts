import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { ProjectsService } from "./projects.service"

/**
 * Project lifecycle controller (oRPC). All handlers are division-scoped via the
 * service layer; permissions are enforced by the RbacGuard from the decorators.
 */
@Controller()
export class ProjectsController {
	constructor(private readonly projectsService: ProjectsService) {}

	@RequirePermissions("projects:read")
	@Implement(v1.project.list)
	async list(@Session() session: UserSession) {
		return implement(v1.project.list).handler(async ({ input }) => {
			return this.projectsService.list(session.user.id, input)
		})
	}

	@RequirePermissions("projects:read")
	@Implement(v1.project.get)
	async get(@Session() session: UserSession) {
		return implement(v1.project.get).handler(async ({ input }) => {
			return this.projectsService.get(session.user.id, input.id)
		})
	}

	@RequirePermissions("projects:create")
	@Implement(v1.project.create)
	async create(@Session() session: UserSession) {
		return implement(v1.project.create).handler(async ({ input }) => {
			return this.projectsService.create(session.user.id, input)
		})
	}

	@RequirePermissions("projects:update")
	@Implement(v1.project.update)
	async update(@Session() session: UserSession) {
		return implement(v1.project.update).handler(async ({ input }) => {
			return this.projectsService.update(session.user.id, input)
		})
	}

	@RequirePermissions("projects:submit")
	@Implement(v1.project.submit)
	async submit(@Session() session: UserSession) {
		return implement(v1.project.submit).handler(async ({ input }) => {
			return this.projectsService.submit(session.user.id, input.id)
		})
	}

	@RequirePermissions("projects:update")
	@Implement(v1.project.activate)
	async activate(@Session() session: UserSession) {
		return implement(v1.project.activate).handler(async ({ input }) => {
			return this.projectsService.activate(session.user.id, input.id)
		})
	}

	@RequirePermissions("projects:read")
	@Implement(v1.project.approval.get)
	async approvalStatus(@Session() session: UserSession) {
		return implement(v1.project.approval.get).handler(async ({ input }) => {
			return this.projectsService.approvalStatus(session.user.id, input.id)
		})
	}
}
