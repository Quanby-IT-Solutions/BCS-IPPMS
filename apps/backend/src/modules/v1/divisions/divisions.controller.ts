import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { DivisionsService } from "./divisions.service"

@Controller()
export class DivisionsController {
	constructor(private readonly divisionsService: DivisionsService) {}

	@RequirePermissions("divisions:read")
	@Implement(v1.division.list)
	async listDivisions() {
		return implement(v1.division.list).handler(async () => {
			return this.divisionsService.list()
		})
	}

	@RequirePermissions("divisions:create")
	@Implement(v1.division.create)
	async createDivision(@Session() session?: UserSession) {
		return implement(v1.division.create).handler(async ({ input }) => {
			return this.divisionsService.create(input, session?.user?.id ?? null)
		})
	}

	@RequirePermissions("divisions:update")
	@Implement(v1.division.update)
	async updateDivision(@Session() session?: UserSession) {
		return implement(v1.division.update).handler(async ({ input }) => {
			return this.divisionsService.update(input, session?.user?.id ?? null)
		})
	}

	@RequirePermissions("divisions:update")
	@Implement(v1.division.setActive)
	async setDivisionActive(@Session() session?: UserSession) {
		return implement(v1.division.setActive).handler(async ({ input }) => {
			return this.divisionsService.setActive(input, session?.user?.id ?? null)
		})
	}
}
