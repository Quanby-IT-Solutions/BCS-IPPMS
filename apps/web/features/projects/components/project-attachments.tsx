"use client"

import { useRef } from "react"
import { Download04Icon, File01Icon, Upload04Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import type { FileMetadata, Project } from "@repo/contracts"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"
import { Skeleton } from "@/core/components/ui/skeleton"
import { canAccess, type AccessProfile } from "@/features/dashboard/lib/access"
import {
	downloadProjectFile,
	useProjectFilesQuery,
	useUploadProjectFileMutation,
} from "@/features/projects/api/projects.hooks"
import { formatDateTime } from "@/features/projects/lib/project-format"

interface ProjectAttachmentsProps {
	project: Project
	access: AccessProfile
}

export function ProjectAttachments({ project, access }: ProjectAttachmentsProps) {
	const canRead = canAccess(access, { requiredPermission: "files:read" })
	const {
		data: files,
		isLoading,
		isError,
		error,
		refetch,
	} = useProjectFilesQuery(project.id, canRead)
	const uploadFile = useUploadProjectFileMutation(project.id)
	const inputRef = useRef<HTMLInputElement>(null)

	const canUpload =
		project.status !== "closed" && canAccess(access, { requiredPermission: "files:upload" })

	async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0]
		if (!file) return
		try {
			await uploadFile.mutateAsync(file)
			toast.success("File uploaded")
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Upload failed")
		} finally {
			if (inputRef.current) {
				inputRef.current.value = ""
			}
		}
	}

	async function handleDownload(file: FileMetadata) {
		try {
			await downloadProjectFile(file)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Download failed")
		}
	}

	if (!canRead && !canUpload) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Attachments</CardTitle>
				</CardHeader>
				<CardContent>
					<Empty className="border">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<HugeiconsIcon icon={File01Icon} strokeWidth={2} />
							</EmptyMedia>
							<EmptyTitle>No access</EmptyTitle>
							<EmptyDescription>You do not have permission to view attachments.</EmptyDescription>
						</EmptyHeader>
					</Empty>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<CardTitle>Attachments</CardTitle>
					{canUpload ? (
						<>
							<input
								ref={inputRef}
								type="file"
								className="hidden"
								onChange={handleFileChange}
								disabled={uploadFile.isPending}
							/>
							<Button
								size="sm"
								onClick={() => inputRef.current?.click()}
								disabled={uploadFile.isPending}
							>
								<HugeiconsIcon icon={Upload04Icon} strokeWidth={2} />
								{uploadFile.isPending ? "Uploading..." : "Upload file"}
							</Button>
						</>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{!canRead ? (
					<Empty className="border">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<HugeiconsIcon icon={File01Icon} strokeWidth={2} />
							</EmptyMedia>
							<EmptyTitle>List unavailable</EmptyTitle>
							<EmptyDescription>
								You can upload files, but you do not have permission to view the attachment list.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : null}

				{canRead && isLoading ? <Skeleton className="h-10 w-full" /> : null}

				{canRead && isError ? (
					<div className="flex flex-col items-start gap-2">
						<p className="text-destructive text-sm">
							{error instanceof Error ? error.message : "Failed to load attachments"}
						</p>
						<Button size="sm" variant="outline" onClick={() => refetch()}>
							Retry
						</Button>
					</div>
				) : null}

				{canRead && files && files.length > 0
					? files.map(file => (
							<div
								key={file.id}
								className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
							>
								<div className="flex min-w-0 items-center gap-2">
									<HugeiconsIcon icon={File01Icon} strokeWidth={2} className="size-4 shrink-0" />
									<span className="truncate">{file.originalName}</span>
									<span className="text-muted-foreground shrink-0 text-xs">
										{formatDateTime(file.createdAt)}
									</span>
								</div>
								<Button
									type="button"
									size="icon-sm"
									variant="ghost"
									onClick={() => handleDownload(file)}
									aria-label={`Download ${file.originalName}`}
								>
									<HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
								</Button>
							</div>
						))
					: null}

				{canRead && files && files.length === 0 ? (
					<Empty className="border">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<HugeiconsIcon icon={File01Icon} strokeWidth={2} />
							</EmptyMedia>
							<EmptyTitle>No attachments</EmptyTitle>
							<EmptyDescription>
								{canUpload ? "Upload progress files and supporting documents." : "No files yet."}
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : null}
			</CardContent>
		</Card>
	)
}
