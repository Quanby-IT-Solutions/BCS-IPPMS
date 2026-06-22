import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { FilesService } from "./files.service"

/**
 * Files metadata controller (oRPC, JSON). Binary upload/download live in
 * {@link FilesUploadController}.
 */
@Controller()
export class FilesController {
	constructor(private readonly filesService: FilesService) {}

	@RequirePermissions("files:read")
	@Implement(v1.file.list)
	async listFiles(@Session() session: UserSession) {
		return implement(v1.file.list).handler(async ({ input }) => {
			return this.filesService.list(session.user.id, input)
		})
	}

	@RequirePermissions("files:read")
	@Implement(v1.file.get)
	async getFile(@Session() session: UserSession) {
		return implement(v1.file.get).handler(async ({ input }) => {
			return this.filesService.getMetadata(session.user.id, input.id)
		})
	}

	@RequirePermissions("files:upload")
	@Implement(v1.file.attach)
	async attachFile(@Session() session: UserSession) {
		return implement(v1.file.attach).handler(async ({ input }) => {
			return this.filesService.attach(input, session.user.id)
		})
	}

	@RequirePermissions("files:delete")
	@Implement(v1.file.delete)
	async deleteFile(@Session() session: UserSession) {
		return implement(v1.file.delete).handler(async ({ input }) => {
			return this.filesService.deleteFile(input.id, session.user.id)
		})
	}
}
