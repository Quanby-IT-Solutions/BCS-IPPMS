"use client"

import { useQuery } from "@tanstack/react-query"

import type { ListAuditLogsResponse } from "@repo/contracts"

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

export interface AuditLogFilters {
	from?: string
	to?: string
	actorId?: string
	module?: string
	entityType?: string
	entityId?: string
	limit?: number
	offset?: number
}

function buildAuditQuery(filters: AuditLogFilters): string {
	const params = new URLSearchParams()
	if (filters.from) params.set("from", filters.from)
	if (filters.to) params.set("to", filters.to)
	if (filters.actorId) params.set("actorId", filters.actorId)
	if (filters.module) params.set("module", filters.module)
	if (filters.entityType) params.set("entityType", filters.entityType)
	if (filters.entityId) params.set("entityId", filters.entityId)
	if (filters.limit !== undefined) params.set("limit", String(filters.limit))
	if (filters.offset !== undefined) params.set("offset", String(filters.offset))
	return params.toString()
}

export const auditKeys = {
	all: ["audit-logs"] as const,
	list: (filters: AuditLogFilters) => ["audit-logs", "list", filters] as const,
}

export function useAuditLogsQuery(filters: AuditLogFilters) {
	return useQuery({
		queryKey: auditKeys.list(filters),
		queryFn: () => {
			const query = buildAuditQuery(filters)
			return apiFetch<ListAuditLogsResponse>(`/audit-logs${query ? `?${query}` : ""}`)
		},
		staleTime: 15 * 1000,
	})
}

/** Streams the filtered audit log as a CSV download via the session cookie. */
export async function exportAuditLogs(filters: AuditLogFilters): Promise<void> {
	const query = buildAuditQuery(filters)
	const response = await fetch(`${API_BASE}/audit-logs/export${query ? `?${query}` : ""}`, {
		credentials: "include",
	})

	if (!response.ok) {
		throw new Error(`Export failed (${response.status})`)
	}

	const blob = await response.blob()
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement("a")
	anchor.href = url
	anchor.download = "audit-logs.csv"
	document.body.appendChild(anchor)
	anchor.click()
	anchor.remove()
	URL.revokeObjectURL(url)
}
