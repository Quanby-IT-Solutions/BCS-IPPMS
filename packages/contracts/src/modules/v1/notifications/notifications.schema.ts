import { z } from "zod"

// ============================================================================
// SHARED
// ============================================================================
const dateField = z
	.union([z.date(), z.string()])
	.transform(val => (typeof val === "string" ? new Date(val) : val))

const NotificationIdParamSchema = z.object({
	id: z.coerce.number().int().positive(),
})

// ============================================================================
// NOTIFICATIONS (always scoped to the current user)
// ============================================================================
export const NotificationSchema = z.object({
	id: z.number().int().positive(),
	userId: z.string(),
	type: z.string(),
	title: z.string(),
	body: z.string().nullable(),
	linkPath: z.string().nullable(),
	isRead: z.boolean(),
	createdAt: dateField,
})

export const ListNotificationsQuerySchema = z.object({
	unreadOnly: z.coerce.boolean().optional(),
	limit: z.coerce.number().int().positive().max(100).optional(),
})

export const UnreadCountResponseSchema = z.object({
	count: z.number().int().nonnegative(),
})

export const MarkAllReadResponseSchema = z.object({
	updated: z.number().int().nonnegative(),
})

export const NotificationIdSchema = NotificationIdParamSchema

// ============================================================================
// TYPES
// ============================================================================
// `NotificationItem` avoids clashing with the DOM `Notification` global.
export type NotificationItem = z.infer<typeof NotificationSchema>
export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuerySchema>
export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>
export type MarkAllReadResponse = z.infer<typeof MarkAllReadResponseSchema>
