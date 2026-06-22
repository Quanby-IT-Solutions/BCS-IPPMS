import {
	BadRequestException,
	Controller,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Query,
	Res,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Response } from "express"

import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { FilesService, type UploadedFilePart } from "./files.service"

/**
 * Multipart upload + streaming download for files. Plain NestJS routes because
 * binary payloads do not fit the oRPC/JSON surface. Versioned to `/api/v1/files`
 * to sit alongside the oRPC metadata routes.
 */
@Controller({ path: "files", version: "1" })
export class FilesUploadController {
	constructor(private readonly filesService: FilesService) {}

	@RequirePermissions("files:upload")
	@Post()
	@UseInterceptors(FileInterceptor("file"))
	async upload(
		@UploadedFile() file: UploadedFilePart | undefined,
		@Query("ownerType") ownerType: string | undefined,
		@Query("ownerId") ownerId: string | undefined,
		@Session() session: UserSession
	) {
		if (!file) {
			throw new BadRequestException("No file uploaded (expected multipart field 'file')")
		}

		const parsedOwnerId = ownerId !== undefined ? Number(ownerId) : undefined
		if (parsedOwnerId !== undefined && (!Number.isInteger(parsedOwnerId) || parsedOwnerId <= 0)) {
			throw new BadRequestException("ownerId must be a positive integer")
		}

		return this.filesService.upload(
			file,
			{
				ownerType: ownerType && ownerType.length > 0 ? ownerType : undefined,
				ownerId: parsedOwnerId,
			},
			session.user.id
		)
	}

	@RequirePermissions("files:download")
	@Get(":id/download")
	async download(
		@Param("id", ParseIntPipe) id: number,
		@Session() session: UserSession,
		@Res({ passthrough: false }) res: Response
	) {
		const { stream, file } = await this.filesService.getForDownload(id, session.user.id)

		res.setHeader("Content-Type", file.mimeType || "application/octet-stream")
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${encodeURIComponent(file.originalName)}"`
		)
		res.setHeader("Content-Length", String(file.size))

		stream.on("error", () => {
			if (!res.headersSent) {
				res.status(500)
			}
			res.end()
		})
		stream.pipe(res)
	}
}
