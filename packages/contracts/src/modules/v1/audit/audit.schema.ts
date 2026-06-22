import { z } from "zod"

// ============================================================================
// SHARED
// ============================================================================
const dateField = z
	.union([z.date(), z.string()])
	.transform(val => (typeof val === "string" ? new Date(val) : val))

// ============================================================================
// AUDIT LOGS (read + export only — writes go through the backend AuditService)
// ============================================================================
export const AuditLogSchema = z.object({
	id: z.number().int().positive(),
	actorId: z.string().nullable(),
	action: z.string(),
	module: z.string().nullable(),
	entityType: z.string().nullable(),
	entityId: z.string().nullable(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	createdAt: dateField,
})

/**
 * Filters for listing/exporting audit logs. `from`/`to` bound `createdAt`;
 * the remaining fields are exact-match filters. `limit`/`offset` paginate.
 */
export const ListAuditLogsQuerySchema = z.object({
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
	actorId: z.string().min(1).max(255).optional(),
	module: z.string().min(1).max(255).optional(),
	entityType: z.string().min(1).max(255).optional(),
	entityId: z.string().min(1).max(255).optional(),
	limit: z.coerce.number().int().positive().max(200).optional(),
	offset: z.coerce.number().int().nonnegative().optional(),
})

export const ListAuditLogsResponseSchema = z.object({
	items: z.array(AuditLogSchema),
	total: z.number().int().nonnegative(),
	limit: z.number().int().positive(),
	offset: z.number().int().nonnegative(),
})

// ============================================================================
// TYPES
// ============================================================================
export type AuditLog = z.infer<typeof AuditLogSchema>
export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>
export type ListAuditLogsResponse = z.infer<typeof ListAuditLogsResponseSchema>
