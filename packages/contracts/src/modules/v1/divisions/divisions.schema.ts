import { z } from "zod"

// ============================================================================
// SHARED
// ============================================================================
const dateField = z
	.union([z.date(), z.string()])
	.transform(val => (typeof val === "string" ? new Date(val) : val))

const DivisionIdParamSchema = z.object({
	id: z.coerce.number().int().positive(),
})

// ============================================================================
// DIVISIONS
// ============================================================================
export const DivisionSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1),
	description: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: dateField,
	updatedAt: dateField,
})

export const CreateDivisionSchema = z.object({
	name: z.string().min(1, "Name is required").max(150, "Name too long"),
	description: z.string().max(500, "Description too long").optional(),
	isActive: z.boolean().optional(),
})

/** Update route input: id from path + optional name/description/isActive. */
export const UpdateDivisionRequestSchema = DivisionIdParamSchema.extend({
	name: z.string().min(1, "Name is required").max(150, "Name too long").optional(),
	description: z.string().max(500, "Description too long").nullable().optional(),
	isActive: z.boolean().optional(),
})

/** Activate/deactivate route input: id from path + explicit isActive flag. */
export const SetDivisionActiveRequestSchema = DivisionIdParamSchema.extend({
	isActive: z.boolean(),
})

export const DivisionIdSchema = DivisionIdParamSchema

// ============================================================================
// TYPES
// ============================================================================
export type Division = z.infer<typeof DivisionSchema>
export type CreateDivisionInput = z.infer<typeof CreateDivisionSchema>
export type UpdateDivisionRequest = z.infer<typeof UpdateDivisionRequestSchema>
export type SetDivisionActiveRequest = z.infer<typeof SetDivisionActiveRequestSchema>
