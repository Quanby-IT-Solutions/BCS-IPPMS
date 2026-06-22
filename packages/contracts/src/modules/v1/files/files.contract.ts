import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AttachFileRequestSchema,
	DeleteFileResponseSchema,
	FileIdSchema,
	FileSchema,
	ListFilesQuerySchema,
} from "./files.schema.js"

/**
 * Files metadata contract (JSON only).
 *
 * Binary upload (`POST /files`) and download (`GET /files/{id}/download`) are
 * served by a dedicated multipart NestJS controller and are intentionally not
 * part of this oRPC surface. Reads require `files:read`, attach requires
 * `files:upload`, delete requires `files:delete` — enforced by the RbacGuard.
 */
export const filesContract = {
	list: oc
		.route({
			method: "GET",
			path: "/files",
			summary: "List file metadata",
			description: "List file metadata, optionally filtered by owner type/id.",
			tags: ["Files"],
		})
		.input(ListFilesQuerySchema)
		.output(z.array(FileSchema)),

	get: oc
		.route({
			method: "GET",
			path: "/files/{id}/metadata",
			summary: "Get file metadata",
			description: "Get metadata for a single file by id.",
			tags: ["Files"],
		})
		.input(FileIdSchema)
		.output(FileSchema),

	attach: oc
		.route({
			method: "PATCH",
			path: "/files/{id}/attach",
			summary: "Attach file to owner",
			description: "Attach an uploaded file to an owner entity (ownerType/ownerId).",
			tags: ["Files"],
		})
		.input(AttachFileRequestSchema)
		.output(FileSchema),

	delete: oc
		.route({
			method: "DELETE",
			path: "/files/{id}",
			summary: "Delete file",
			description: "Delete a file record and its stored object.",
			tags: ["Files"],
		})
		.input(FileIdSchema)
		.output(DeleteFileResponseSchema),
}

export { FileIdSchema }
