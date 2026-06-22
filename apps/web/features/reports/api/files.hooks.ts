"use client"

import { useMutation } from "@tanstack/react-query"

import type { FileMetadata } from "@repo/contracts"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/${env.NEXT_PUBLIC_API_VERSION}`

/**
 * Uploads a single file via the generic multipart POST /files route. The
 * browser sets the multipart boundary, so Content-Type is intentionally NOT
 * set here. The session cookie authorizes the request.
 */
async function uploadFile(file: File): Promise<FileMetadata> {
	const formData = new FormData()
	formData.append("file", file)

	const response = await fetch(`${API_BASE}/files`, {
		method: "POST",
		credentials: "include",
		body: formData,
	})

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
}

export function useUploadFileMutation() {
	return useMutation({
		mutationFn: (file: File) => uploadFile(file),
	})
}
