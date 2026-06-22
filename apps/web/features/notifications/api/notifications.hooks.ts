"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { MarkAllReadResponse, NotificationItem, UnreadCountResponse } from "@repo/contracts"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/${env.NEXT_PUBLIC_API_VERSION}`

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE}${path}`, {
		...init,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
	})

	if (!response.ok) {
		let message = `Request failed (${response.status})`
		try {
			const body = (await response.json()) as { message?: string; error?: { message?: string } }
			message = body?.message ?? body?.error?.message ?? message
		} catch {
			// ignore non-JSON error bodies
		}
		throw new Error(message)
	}

	if (response.status === 204) {
		return undefined as T
	}

	return (await response.json()) as T
}

export const notificationKeys = {
	all: ["notifications"] as const,
	list: (unreadOnly?: boolean, limit?: number) =>
		["notifications", "list", { unreadOnly: unreadOnly ?? false, limit: limit ?? null }] as const,
	unreadCount: ["notifications", "unread-count"] as const,
}

interface NotificationListOptions {
	unreadOnly?: boolean
	limit?: number
}

export function useNotificationsQuery(options: NotificationListOptions = {}) {
	const { unreadOnly, limit } = options

	return useQuery({
		queryKey: notificationKeys.list(unreadOnly, limit),
		queryFn: () => {
			const params = new URLSearchParams()
			if (unreadOnly) {
				params.set("unreadOnly", "true")
			}
			if (limit) {
				params.set("limit", String(limit))
			}
			const query = params.toString()

			return apiFetch<NotificationItem[]>(`/notifications${query ? `?${query}` : ""}`)
		},
		staleTime: 30 * 1000,
	})
}

export function useUnreadNotificationCountQuery() {
	return useQuery({
		queryKey: notificationKeys.unreadCount,
		queryFn: () => apiFetch<UnreadCountResponse>("/notifications/unread-count"),
		staleTime: 30 * 1000,
		refetchInterval: 60 * 1000,
		refetchOnWindowFocus: true,
		retry: false,
	})
}

export function useMarkNotificationReadMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: number) =>
			apiFetch<NotificationItem>(`/notifications/${id}/read`, { method: "PATCH" }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
	})
}

export function useMarkAllNotificationsReadMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: () => apiFetch<MarkAllReadResponse>("/notifications/read-all", { method: "POST" }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
	})
}
