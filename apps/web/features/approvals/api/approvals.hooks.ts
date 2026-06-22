"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
	ActOnRequestInput,
	ApprovalModule,
	ApprovalRequestDetail,
	ApprovalRequestSummary,
	ApprovalWorkflowDetail,
	ApprovalWorkflowSummary,
	CreateApprovalWorkflowInput,
	FileMetadata,
	UpdateApprovalWorkflowInput,
} from "@repo/contracts"

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

export const approvalKeys = {
	all: ["approvals"] as const,
	inbox: ["approvals", "inbox"] as const,
	workflows: ["approvals", "workflows"] as const,
	workflowList: (filters?: { module?: ApprovalModule; divisionId?: number }) =>
		["approvals", "workflows", "list", filters ?? {}] as const,
	workflowDetail: (id: number) => ["approvals", "workflows", "detail", id] as const,
	requestDetail: (id: number) => ["approvals", "requests", "detail", id] as const,
	subjectFiles: (ownerType: string, ownerId: number) =>
		["approvals", "subject-files", ownerType, ownerId] as const,
}

/**
 * The "My Approvals" inbox — pending requests the current user is eligible to
 * act on. Powers both the sidebar/dashboard pending-approvals surfacing and the
 * future inbox screen (T10). `enabled` lets callers gate the request on the
 * `approval-requests:read` permission to avoid guaranteed 403s.
 */
export function useApprovalInboxQuery(options: { enabled?: boolean } = {}) {
	return useQuery({
		queryKey: approvalKeys.inbox,
		queryFn: () => apiFetch<ApprovalRequestSummary[]>("/approvals/requests/inbox"),
		enabled: options.enabled ?? true,
		staleTime: 30 * 1000,
		retry: false,
	})
}

// ---------------------------------------------------------- workflow builder
export function useWorkflowsQuery(filters?: { module?: ApprovalModule; divisionId?: number }) {
	return useQuery({
		queryKey: approvalKeys.workflowList(filters),
		queryFn: () => {
			const params = new URLSearchParams()
			if (filters?.module) {
				params.set("module", filters.module)
			}
			if (filters?.divisionId) {
				params.set("divisionId", String(filters.divisionId))
			}
			const query = params.toString()
			return apiFetch<ApprovalWorkflowSummary[]>(`/approvals/workflows${query ? `?${query}` : ""}`)
		},
		staleTime: 30 * 1000,
	})
}

export function useWorkflowQuery(id: number | null, enabled = true) {
	return useQuery({
		queryKey: approvalKeys.workflowDetail(id ?? 0),
		queryFn: () => apiFetch<ApprovalWorkflowDetail>(`/approvals/workflows/${id}`),
		enabled: enabled && id !== null,
	})
}

export function useCreateWorkflowMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (payload: CreateApprovalWorkflowInput) =>
			apiFetch<ApprovalWorkflowDetail>("/approvals/workflows", {
				method: "POST",
				body: JSON.stringify(payload),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: approvalKeys.workflows }),
	})
}

export function useUpdateWorkflowMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...rest }: UpdateApprovalWorkflowInput) =>
			apiFetch<ApprovalWorkflowDetail>(`/approvals/workflows/${id}`, {
				method: "PUT",
				body: JSON.stringify(rest),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: approvalKeys.workflows }),
	})
}

export function useDeleteWorkflowMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: number) =>
			apiFetch<{ id: number; deleted: true }>(`/approvals/workflows/${id}`, { method: "DELETE" }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: approvalKeys.workflows }),
	})
}

// -------------------------------------------------------- requests / review
export function useApprovalRequestQuery(id: number | null, enabled = true) {
	return useQuery({
		queryKey: approvalKeys.requestDetail(id ?? 0),
		queryFn: () => apiFetch<ApprovalRequestDetail>(`/approvals/requests/${id}`),
		enabled: enabled && id !== null,
	})
}

/**
 * Lists the attachments of the request's subject (e.g. project files). Gated by
 * `enabled` so it only fires when the subject is a project AND the user can read
 * files. The backend `/files` endpoint is owner-aware/division-scoped: a
 * cross-division delegate may get a 404, surfaced here as a query error that the
 * UI degrades gracefully on.
 */
export function useApprovalSubjectFilesQuery(
	params: { ownerType: string; ownerId: number } | null,
	enabled: boolean
) {
	return useQuery({
		queryKey: approvalKeys.subjectFiles(params?.ownerType ?? "", params?.ownerId ?? 0),
		queryFn: () =>
			apiFetch<FileMetadata[]>(
				`/files?ownerType=${params?.ownerType ?? ""}&ownerId=${params?.ownerId ?? 0}`
			),
		enabled: enabled && params !== null,
		retry: false,
	})
}

/**
 * Downloads a subject attachment via `GET /files/{id}/download` and triggers a
 * browser download. Self-contained within the approvals feature to preserve
 * feature isolation (mirrors `downloadProjectFile` in the projects feature).
 */
export async function downloadApprovalFile(file: Pick<FileMetadata, "id" | "originalName">) {
	const response = await fetch(`${API_BASE}/files/${file.id}/download`, {
		credentials: "include",
	})
	if (!response.ok) {
		throw new Error(`Download failed (${response.status})`)
	}
	const blob = await response.blob()
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement("a")
	anchor.href = url
	anchor.download = file.originalName
	document.body.appendChild(anchor)
	anchor.click()
	anchor.remove()
	URL.revokeObjectURL(url)
}

export function useActOnRequestMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...rest }: ActOnRequestInput) =>
			apiFetch<ApprovalRequestDetail>(`/approvals/requests/${id}/actions`, {
				method: "POST",
				body: JSON.stringify(rest),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: approvalKeys.inbox })
			queryClient.invalidateQueries({ queryKey: approvalKeys.requestDetail(variables.id) })
			queryClient.invalidateQueries({ queryKey: ["notifications"] })
		},
	})
}
