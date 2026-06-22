"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
	CreateMilestoneInput,
	CreateProjectInput,
	CreateTaskInput,
	FileMetadata,
	Project,
	ProjectApprovalStatus,
	ProjectClosure,
	ProjectMilestone,
	ProjectStatus,
	ProjectTask,
	SubmitClosureInput,
	TaskStatus,
	UpdateMilestoneRequest,
	UpdateProjectRequest,
	UpdateTaskRequest,
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

export interface ProjectListFilters {
	status?: ProjectStatus
	divisionId?: number
}

export interface TaskListFilters {
	projectId?: number
	assigneeId?: string
	status?: TaskStatus
}

export const projectKeys = {
	all: ["projects"] as const,
	lists: ["projects", "list"] as const,
	list: (filters?: ProjectListFilters) => ["projects", "list", filters ?? {}] as const,
	detail: (id: number) => ["projects", "detail", id] as const,
	approval: (id: number) => ["projects", "approval", id] as const,
	tasksAll: ["project-tasks"] as const,
	tasks: (filters?: TaskListFilters) => ["project-tasks", "list", filters ?? {}] as const,
	taskDetail: (id: number) => ["project-tasks", "detail", id] as const,
	milestonesAll: ["project-milestones"] as const,
	milestones: (projectId: number) => ["project-milestones", "list", projectId] as const,
	closure: (projectId: number) => ["project-closures", projectId] as const,
	files: (projectId: number) => ["files", "projects", projectId] as const,
}

function buildQuery(params: Record<string, string | number | undefined>): string {
	const search = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== "") {
			search.set(key, String(value))
		}
	}
	const query = search.toString()
	return query ? `?${query}` : ""
}

// ============================================================================
// PROJECTS
// ============================================================================
export function useProjectsQuery(filters?: ProjectListFilters) {
	return useQuery({
		queryKey: projectKeys.list(filters),
		queryFn: () =>
			apiFetch<Project[]>(
				`/projects${buildQuery({ status: filters?.status, divisionId: filters?.divisionId })}`
			),
		staleTime: 30 * 1000,
	})
}

export function useProjectQuery(id: number | null, enabled = true) {
	return useQuery({
		queryKey: projectKeys.detail(id ?? 0),
		queryFn: () => apiFetch<Project>(`/projects/${id}`),
		enabled: enabled && id !== null,
	})
}

export function useCreateProjectMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (payload: CreateProjectInput) =>
			apiFetch<Project>("/projects", { method: "POST", body: JSON.stringify(payload) }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.lists }),
	})
}

export function useUpdateProjectMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...rest }: UpdateProjectRequest) =>
			apiFetch<Project>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(rest) }),
		onSuccess: project => {
			queryClient.invalidateQueries({ queryKey: projectKeys.lists })
			queryClient.invalidateQueries({ queryKey: projectKeys.detail(project.id) })
		},
	})
}

export function useSubmitProjectMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: number) => apiFetch<Project>(`/projects/${id}/submit`, { method: "POST" }),
		onSuccess: project => {
			queryClient.invalidateQueries({ queryKey: projectKeys.lists })
			queryClient.invalidateQueries({ queryKey: projectKeys.detail(project.id) })
			queryClient.invalidateQueries({ queryKey: projectKeys.approval(project.id) })
		},
	})
}

export function useActivateProjectMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: number) => apiFetch<Project>(`/projects/${id}/activate`, { method: "POST" }),
		onSuccess: project => {
			queryClient.invalidateQueries({ queryKey: projectKeys.lists })
			queryClient.invalidateQueries({ queryKey: projectKeys.detail(project.id) })
			queryClient.invalidateQueries({ queryKey: projectKeys.approval(project.id) })
		},
	})
}

export function useProjectApprovalQuery(id: number | null, enabled = true) {
	return useQuery({
		queryKey: projectKeys.approval(id ?? 0),
		queryFn: () => apiFetch<ProjectApprovalStatus>(`/projects/${id}/approval`),
		enabled: enabled && id !== null,
	})
}

// ============================================================================
// TASKS
// ============================================================================
export function useTasksQuery(filters?: TaskListFilters, enabled = true) {
	return useQuery({
		queryKey: projectKeys.tasks(filters),
		queryFn: () =>
			apiFetch<ProjectTask[]>(
				`/project-tasks${buildQuery({
					projectId: filters?.projectId,
					assigneeId: filters?.assigneeId,
					status: filters?.status,
				})}`
			),
		enabled,
		staleTime: 30 * 1000,
	})
}

export function useTaskQuery(id: number | null, enabled = true) {
	return useQuery({
		queryKey: projectKeys.taskDetail(id ?? 0),
		queryFn: () => apiFetch<ProjectTask>(`/project-tasks/${id}`),
		enabled: enabled && id !== null,
	})
}

export function useCreateTaskMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (payload: CreateTaskInput) =>
			apiFetch<ProjectTask>("/project-tasks", { method: "POST", body: JSON.stringify(payload) }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.tasksAll }),
	})
}

export function useUpdateTaskMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...rest }: UpdateTaskRequest) =>
			apiFetch<ProjectTask>(`/project-tasks/${id}`, { method: "PUT", body: JSON.stringify(rest) }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.tasksAll }),
	})
}

export function useDeleteTaskMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: number) =>
			apiFetch<{ id: number; deleted: true }>(`/project-tasks/${id}`, { method: "DELETE" }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.tasksAll }),
	})
}

export function useAssignTaskMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, assigneeId }: { id: number; assigneeId: string | null }) =>
			apiFetch<ProjectTask>(`/project-tasks/${id}/assign`, {
				method: "PATCH",
				body: JSON.stringify({ assigneeId }),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.tasksAll }),
	})
}

export function useSetTaskStatusMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
			apiFetch<ProjectTask>(`/project-tasks/${id}/status`, {
				method: "PATCH",
				body: JSON.stringify({ status }),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.tasksAll }),
	})
}

// ============================================================================
// MILESTONES
// ============================================================================
export function useMilestonesQuery(projectId: number | null, enabled = true) {
	return useQuery({
		queryKey: projectKeys.milestones(projectId ?? 0),
		queryFn: () =>
			apiFetch<ProjectMilestone[]>(
				`/project-milestones${buildQuery({ projectId: projectId ?? undefined })}`
			),
		enabled: enabled && projectId !== null,
		staleTime: 30 * 1000,
	})
}

export function useCreateMilestoneMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (payload: CreateMilestoneInput) =>
			apiFetch<ProjectMilestone>("/project-milestones", {
				method: "POST",
				body: JSON.stringify(payload),
			}),
		onSuccess: milestone =>
			queryClient.invalidateQueries({ queryKey: projectKeys.milestones(milestone.projectId) }),
	})
}

export function useUpdateMilestoneMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...rest }: UpdateMilestoneRequest) =>
			apiFetch<ProjectMilestone>(`/project-milestones/${id}`, {
				method: "PUT",
				body: JSON.stringify(rest),
			}),
		onSuccess: milestone =>
			queryClient.invalidateQueries({ queryKey: projectKeys.milestones(milestone.projectId) }),
	})
}

export function useDeleteMilestoneMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: number) =>
			apiFetch<{ id: number; deleted: true }>(`/project-milestones/${id}`, { method: "DELETE" }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.milestonesAll }),
	})
}

export function useSetMilestoneStatusMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, status }: { id: number; status: ProjectMilestone["status"] }) =>
			apiFetch<ProjectMilestone>(`/project-milestones/${id}/status`, {
				method: "PATCH",
				body: JSON.stringify({ status }),
			}),
		onSuccess: milestone =>
			queryClient.invalidateQueries({ queryKey: projectKeys.milestones(milestone.projectId) }),
	})
}

export function useSetMilestoneProgressMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, progress }: { id: number; progress: number }) =>
			apiFetch<ProjectMilestone>(`/project-milestones/${id}/progress`, {
				method: "PATCH",
				body: JSON.stringify({ progress }),
			}),
		onSuccess: milestone =>
			queryClient.invalidateQueries({ queryKey: projectKeys.milestones(milestone.projectId) }),
	})
}

// ============================================================================
// CLOSURE
// ============================================================================
export function useClosureQuery(projectId: number | null, enabled = true) {
	return useQuery({
		queryKey: projectKeys.closure(projectId ?? 0),
		queryFn: () => apiFetch<ProjectClosure | null>(`/project-closures/${projectId}`),
		enabled: enabled && projectId !== null,
	})
}

export function useSubmitClosureMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (payload: SubmitClosureInput) =>
			apiFetch<ProjectClosure>("/project-closures", {
				method: "POST",
				body: JSON.stringify(payload),
			}),
		onSuccess: closure => {
			queryClient.invalidateQueries({ queryKey: projectKeys.lists })
			queryClient.invalidateQueries({ queryKey: projectKeys.detail(closure.projectId) })
			queryClient.invalidateQueries({ queryKey: projectKeys.closure(closure.projectId) })
		},
	})
}

// ============================================================================
// FILES (project attachments)
// ============================================================================
const OWNER_TYPE = "project"

export function useProjectFilesQuery(projectId: number | null, enabled = true) {
	return useQuery({
		queryKey: projectKeys.files(projectId ?? 0),
		queryFn: () =>
			apiFetch<FileMetadata[]>(
				`/files${buildQuery({ ownerType: OWNER_TYPE, ownerId: projectId ?? undefined })}`
			),
		enabled: enabled && projectId !== null,
	})
}

export function useUploadProjectFileMutation(projectId: number) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (file: File): Promise<FileMetadata> => {
			const formData = new FormData()
			formData.append("file", file)

			const response = await fetch(
				`${API_BASE}/files${buildQuery({ ownerType: OWNER_TYPE, ownerId: projectId })}`,
				{
					method: "POST",
					credentials: "include",
					body: formData,
				}
			)

			if (!response.ok) {
				let message = `Upload failed (${response.status})`
				try {
					const body = (await response.json()) as { message?: string; error?: { message?: string } }
					message = body?.message ?? body?.error?.message ?? message
				} catch {
					// ignore non-JSON error bodies
				}
				throw new Error(message)
			}

			return (await response.json()) as FileMetadata
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.files(projectId) }),
	})
}

/** Downloads a file by id through the dedicated multipart route, preserving the cookie session. */
export async function downloadProjectFile(file: Pick<FileMetadata, "id" | "originalName">) {
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
