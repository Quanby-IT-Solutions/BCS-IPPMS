import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	ListNotificationsQuerySchema,
	MarkAllReadResponseSchema,
	NotificationIdSchema,
	NotificationSchema,
	UnreadCountResponseSchema,
} from "./notifications.schema.js"

/**
 * Notifications contract. Every endpoint operates on the authenticated user's
 * own notifications only. Reads require `notifications:read`; marking read
 * requires `notifications:manage` — enforced by the RbacGuard. Notifications
 * are created server-side by other modules, never directly by clients.
 */
export const notificationsContract = {
	list: oc
		.route({
			method: "GET",
			path: "/notifications",
			summary: "List notifications",
			description: "List the current user's notifications (newest first).",
			tags: ["Notifications"],
		})
		.input(ListNotificationsQuerySchema)
		.output(z.array(NotificationSchema)),

	unreadCount: oc
		.route({
			method: "GET",
			path: "/notifications/unread-count",
			summary: "Unread notification count",
			description: "Count the current user's unread notifications.",
			tags: ["Notifications"],
		})
		.output(UnreadCountResponseSchema),

	markRead: oc
		.route({
			method: "PATCH",
			path: "/notifications/{id}/read",
			summary: "Mark notification read",
			description: "Mark one of the current user's notifications as read.",
			tags: ["Notifications"],
		})
		.input(NotificationIdSchema)
		.output(NotificationSchema),

	markAllRead: oc
		.route({
			method: "POST",
			path: "/notifications/read-all",
			summary: "Mark all notifications read",
			description: "Mark all of the current user's notifications as read.",
			tags: ["Notifications"],
		})
		.output(MarkAllReadResponseSchema),
}
