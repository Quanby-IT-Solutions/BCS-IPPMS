"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { CreateDivisionInput, Division, UpdateDivisionRequest } from "@repo/contracts"

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

export const divisionKeys = {
	all: ["divisions"] as const,
	list: ["divisions", "list"] as const,
}

export function useDivisionsQuery() {
	return useQuery({
		queryKey: divisionKeys.list,
		queryFn: () => apiFetch<Division[]>("/divisions"),
		staleTime: 60 * 1000,
	})
}

export function useCreateDivisionMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (payload: CreateDivisionInput) =>
			apiFetch<Division>("/divisions", { method: "POST", body: JSON.stringify(payload) }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: divisionKeys.all }),
	})
}

export function useUpdateDivisionMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...rest }: UpdateDivisionRequest) =>
			apiFetch<Division>(`/divisions/${id}`, { method: "PUT", body: JSON.stringify(rest) }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: divisionKeys.all }),
	})
}

export function useSetDivisionActiveMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
			apiFetch<Division>(`/divisions/${id}/active`, {
				method: "PATCH",
				body: JSON.stringify({ isActive }),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: divisionKeys.all }),
	})
}
