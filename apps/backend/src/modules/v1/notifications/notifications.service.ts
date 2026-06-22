import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { and, count, desc, eq } from "drizzle-orm"

import {
	type ListNotificationsQuery,
	type MarkAllReadResponse,
	type NotificationItem,
	type UnreadCountResponse,
} from "@repo/contracts"
import { notifications } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

const DEFAULT_LIMIT = 50

@Injectable()
export class NotificationsService {
	/** List the user's own notifications, newest first. */
	async list(userId: string, query: ListNotificationsQuery): Promise<NotificationItem[]> {
		const conditions = [eq(notifications.userId, userId)]
		if (query.unreadOnly) {
			conditions.push(eq(notifications.isRead, false))
		}

		const rows = await db
			.select()
			.from(notifications)
			.where(and(...conditions))
			.orderBy(desc(notifications.createdAt))
			.limit(query.limit ?? DEFAULT_LIMIT)

		return rows.map(row => this.toItem(row))
	}

	/** Count the user's unread notifications. */
	async unreadCount(userId: string): Promise<UnreadCountResponse> {
		const [row] = await db
			.select({ value: count() })
			.from(notifications)
			.where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

		return { count: row?.value ?? 0 }
	}

	/** Mark one of the user's own notifications as read. */
	async markRead(userId: string, id: number): Promise<NotificationItem> {
		const [existing] = await db
			.select()
			.from(notifications)
			.where(and(eq(notifications.id, id), eq(notifications.userId, userId)))

		if (!existing) {
			throw new ORPCError("NOT_FOUND", { message: `Notification with ID ${id} not found` })
		}

		if (existing.isRead) {
			return this.toItem(existing)
		}

		const [row] = await db
			.update(notifications)
			.set({ isRead: true })
			.where(eq(notifications.id, id))
			.returning()

		return this.toItem(row ?? existing)
	}

	/** Mark all of the user's unread notifications as read. */
	async markAllRead(userId: string): Promise<MarkAllReadResponse> {
		const rows = await db
			.update(notifications)
			.set({ isRead: true })
			.where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
			.returning({ id: notifications.id })

		return { updated: rows.length }
	}

	/**
	 * Create a notification for a user. Intended for other backend modules to
	 * call (e.g. approvals, projects); no external delivery is performed.
	 */
	async createForUser(input: {
		userId: string
		type: string
		title: string
		body?: string | null
		linkPath?: string | null
	}): Promise<NotificationItem> {
		const [row] = await db
			.insert(notifications)
			.values({
				userId: input.userId,
				type: input.type,
				title: input.title,
				body: input.body ?? null,
				linkPath: input.linkPath ?? null,
			})
			.returning()

		if (!row) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Notification could not be created",
			})
		}

		return this.toItem(row)
	}

	private toItem(row: typeof notifications.$inferSelect): NotificationItem {
		return {
			id: row.id,
			userId: row.userId,
			type: row.type,
			title: row.title,
			body: row.body,
			linkPath: row.linkPath,
			isRead: row.isRead,
			createdAt: row.createdAt,
		}
	}
}
