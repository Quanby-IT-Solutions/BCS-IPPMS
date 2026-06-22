import { z } from "zod"

// ============================================================================
// SHARED
// ============================================================================
const dateField = z
	.union([z.date(), z.string()])
	.transform(val => (typeof val === "string" ? new Date(val) : val))

const FileIdParamSchema = z.object({
	id: z.coerce.number().int().positive(),
})

// ============================================================================
// FILES (metadata only — binary upload/download are plain NestJS routes)
// ============================================================================

/**
 * Public file metadata. The internal `storageKey` is deliberately NOT exposed
 * to clients; downloads are served by id through a dedicated route.
 */
export const FileSchema = z.object({
	id: z.number().int().positive(),
	originalName: z.string(),
	mimeType: z.string(),
	size: z.number().int().nonnegative(),
	ownerType: z.string().nullable(),
	ownerId: z.number().int().positive().nullable(),
	uploadedBy: z.string(),
	createdAt: dateField,
})

export const ListFilesQuerySchema = z.object({
	ownerType: z.string().min(1).max(100).optional(),
	ownerId: z.coerce.number().int().positive().optional(),
})

export const AttachFileRequestSchema = FileIdParamSchema.extend({
	ownerType: z.string().min(1).max(100),
	ownerId: z.coerce.number().int().positive(),
})

export const DeleteFileResponseSchema = z.object({
	id: z.number().int().positive(),
	deleted: z.boolean(),
})

export const FileIdSchema = FileIdParamSchema

// ============================================================================
// TYPES
// ============================================================================
export type FileMetadata = z.infer<typeof FileSchema>
export type ListFilesQuery = z.infer<typeof ListFilesQuerySchema>
export type AttachFileRequest = z.infer<typeof AttachFileRequestSchema>
export type DeleteFileResponse = z.infer<typeof DeleteFileResponseSchema>
