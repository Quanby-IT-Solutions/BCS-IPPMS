"use client"

import { useQuery } from "@tanstack/react-query"

import type { ReportFormat, ReportPreview, ReportType } from "@repo/contracts"

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

	return (await response.json()) as T
}

export interface ReportParamsForm {
	type: ReportType
	from?: string
	to?: string
	divisionId?: number
	status?: string
	module?: string
	limit?: number
}

function buildReportQuery(params: ReportParamsForm): string {
	const search = new URLSearchParams()
	search.set("type", params.type)
	if (params.from) search.set("from", params.from)
	if (params.to) search.set("to", params.to)
	if (params.divisionId !== undefined) search.set("divisionId", String(params.divisionId))
	if (params.status) search.set("status", params.status)
	if (params.module) search.set("module", params.module)
	if (params.limit !== undefined) search.set("limit", String(params.limit))
	return search.toString()
}

export const reportKeys = {
	all: ["reports"] as const,
	preview: (params: ReportParamsForm) => ["reports", "preview", params] as const,
}

export function useReportPreviewQuery(params: ReportParamsForm, enabled: boolean) {
	return useQuery({
		queryKey: reportKeys.preview(params),
		queryFn: () => apiFetch<ReportPreview>(`/reports/preview?${buildReportQuery(params)}`),
		enabled,
		staleTime: 0,
	})
}

function filenameFromDisposition(header: string | null, fallback: string): string {
	if (!header) return fallback
	const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header)
	if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])
	const quotedMatch = /filename="?([^";]+)"?/i.exec(header)
	if (quotedMatch?.[1]) return quotedMatch[1]
	return fallback
}

const FORMAT_EXT: Record<ReportFormat, string> = {
	csv: "csv",
	excel: "xlsx",
	pdf: "pdf",
}

/** Streams a report export of the given format as a file download. */
export async function exportReport(params: ReportParamsForm, format: ReportFormat): Promise<void> {
	const query = `${buildReportQuery(params)}&format=${format}`
	const response = await fetch(`${API_BASE}/reports/export?${query}`, {
		credentials: "include",
	})

	if (!response.ok) {
		throw new Error(`Export failed (${response.status})`)
	}

	const blob = await response.blob()
	const filename = filenameFromDisposition(
		response.headers.get("content-disposition"),
		`${params.type}.${FORMAT_EXT[format]}`
	)
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement("a")
	anchor.href = url
	anchor.download = filename
	document.body.appendChild(anchor)
	anchor.click()
	anchor.remove()
	URL.revokeObjectURL(url)
}
