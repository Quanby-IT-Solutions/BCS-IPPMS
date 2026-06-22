import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { ProjectTasksService } from "./project-tasks.service"

/** Project task delegation controller (oRPC). Includes the global tasks board. */
@Controller()
export class ProjectTasksController {
	constructor(private readonly tasksService: ProjectTasksService) {}

	@RequirePermissions("project-tasks:read")
	@Implement(v1.project.tasks.list)
	async list(@Session() session: UserSession) {
		return implement(v1.project.tasks.list).handler(async ({ input }) => {
			return this.tasksService.list(session.user.id, input)
		})
	}

	@RequirePermissions("project-tasks:read")
	@Implement(v1.project.tasks.get)
	async get(@Session() session: UserSession) {
		return implement(v1.project.tasks.get).handler(async ({ input }) => {
			return this.tasksService.get(session.user.id, input.id)
		})
	}

	@RequirePermissions("project-tasks:create")
	@Implement(v1.project.tasks.create)
	async create(@Session() session: UserSession) {
		return implement(v1.project.tasks.create).handler(async ({ input }) => {
			return this.tasksService.create(session.user.id, input)
		})
	}

	@RequirePermissions("project-tasks:update")
	@Implement(v1.project.tasks.update)
	async update(@Session() session: UserSession) {
		return implement(v1.project.tasks.update).handler(async ({ input }) => {
			return this.tasksService.update(session.user.id, input)
		})
	}

	@RequirePermissions("project-tasks:delete")
	@Implement(v1.project.tasks.delete)
	async delete(@Session() session: UserSession) {
		return implement(v1.project.tasks.delete).handler(async ({ input }) => {
			return this.tasksService.delete(session.user.id, input.id)
		})
	}

	@RequirePermissions("project-tasks:assign")
	@Implement(v1.project.tasks.assign)
	async assign(@Session() session: UserSession) {
		return implement(v1.project.tasks.assign).handler(async ({ input }) => {
			return this.tasksService.assign(session.user.id, input)
		})
	}

	@RequirePermissions("project-tasks:update")
	@Implement(v1.project.tasks.setStatus)
	async setStatus(@Session() session: UserSession) {
		return implement(v1.project.tasks.setStatus).handler(async ({ input }) => {
			return this.tasksService.setStatus(session.user.id, input)
		})
	}
}
