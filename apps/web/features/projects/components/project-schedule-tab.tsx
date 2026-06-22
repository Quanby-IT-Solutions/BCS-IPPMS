"use client"

import { useState } from "react"
import {
	Add01Icon,
	Calendar01Icon,
	Delete02Icon,
	PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import type { MilestoneStatus, Project, ProjectMilestone } from "@repo/contracts"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { Progress } from "@/core/components/ui/progress"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { canAccess, type AccessProfile } from "@/features/dashboard/lib/access"
import {
	useCreateMilestoneMutation,
	useDeleteMilestoneMutation,
	useMilestonesQuery,
	useUpdateMilestoneMutation,
} from "@/features/projects/api/projects.hooks"
import {
	formatDate,
	isOverdue,
	MILESTONE_STATUS_LABELS,
	MILESTONE_STATUS_VARIANTS,
	toDateInputValue,
} from "@/features/projects/lib/project-format"

const STATUS_OPTIONS: readonly MilestoneStatus[] = ["pending", "in_progress", "done"]

interface ProjectScheduleTabProps {
	project: Project
	access: AccessProfile
}

export function ProjectScheduleTab({ project, access }: ProjectScheduleTabProps) {
	const { data: milestones, isLoading, isError, error, refetch } = useMilestonesQuery(project.id)
	const deleteMilestone = useDeleteMilestoneMutation()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editing, setEditing] = useState<ProjectMilestone | undefined>(undefined)
	const [toDelete, setToDelete] = useState<ProjectMilestone | null>(null)

	const readOnly =
		project.status === "closed" ||
		!canAccess(access, { requiredPermission: "project-milestones:update" })
	const canCreate =
		project.status !== "closed" &&
		canAccess(access, { requiredPermission: "project-milestones:create" })
	const canDelete =
		project.status !== "closed" &&
		canAccess(access, { requiredPermission: "project-milestones:delete" })

	function openCreate() {
		setEditing(undefined)
		setDialogOpen(true)
	}

	function openEdit(milestone: ProjectMilestone) {
		setEditing(milestone)
		setDialogOpen(true)
	}

	async function confirmDelete() {
		if (!toDelete) return
		try {
			await deleteMilestone.mutateAsync(toDelete.id)
			toast.success("Milestone deleted")
			setToDelete(null)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete milestone")
		}
	}

	return (
		<div className="flex flex-col gap-4">
			{canCreate ? (
				<div className="flex justify-end">
					<Button size="sm" onClick={openCreate}>
						<HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
						New Milestone
					</Button>
				</div>
			) : null}

			{isLoading ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			) : null}

			{isError ? (
				<div className="flex flex-col items-start gap-2">
					<p className="text-destructive text-sm">
						{error instanceof Error ? error.message : "Failed to load milestones"}
					</p>
					<Button size="sm" variant="outline" onClick={() => refetch()}>
						Retry
					</Button>
				</div>
			) : null}

			{milestones && milestones.length > 0 ? (
				<ol className="flex flex-col gap-3">
					{milestones.map(milestone => {
						const overdue = isOverdue(milestone.dueDate, milestone.status === "done")
						return (
							<li key={milestone.id}>
								<Card>
									<CardContent className="flex flex-col gap-3 pt-6">
										<div className="flex flex-wrap items-start justify-between gap-2">
											<div className="flex flex-col gap-1">
												<span className="font-medium">{milestone.name}</span>
												<div className="flex flex-wrap items-center gap-2 text-xs">
													<Badge variant={MILESTONE_STATUS_VARIANTS[milestone.status]}>
														{MILESTONE_STATUS_LABELS[milestone.status]}
													</Badge>
													{milestone.dueDate ? (
														<Badge variant={overdue ? "destructive" : "outline"}>
															Due {formatDate(milestone.dueDate)}
														</Badge>
													) : null}
												</div>
											</div>
											<div className="flex items-center gap-1">
												{!readOnly ? (
													<Button
														variant="ghost"
														size="icon-sm"
														onClick={() => openEdit(milestone)}
														aria-label={`Edit ${milestone.name}`}
													>
														<HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
													</Button>
												) : null}
												{canDelete ? (
													<Button
														variant="ghost"
														size="icon-sm"
														onClick={() => setToDelete(milestone)}
														aria-label={`Delete ${milestone.name}`}
													>
														<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
													</Button>
												) : null}
											</div>
										</div>
										<div className="flex items-center gap-3">
											<Progress value={milestone.progress} className="h-2" />
											<span className="text-muted-foreground w-10 text-right text-xs">
												{milestone.progress}%
											</span>
										</div>
									</CardContent>
								</Card>
							</li>
						)
					})}
				</ol>
			) : null}

			{milestones && milestones.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} />
						</EmptyMedia>
						<EmptyTitle>No milestones</EmptyTitle>
						<EmptyDescription>
							{canCreate
								? "Plan milestones to schedule the project."
								: "Milestones will appear here."}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}

			<MilestoneFormDialog
				key={editing?.id ?? "new"}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				projectId={project.id}
				milestone={editing}
			/>

			<AlertDialog open={Boolean(toDelete)} onOpenChange={open => !open && setToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete milestone</AlertDialogTitle>
						<AlertDialogDescription>
							{toDelete ? `Delete "${toDelete.name}"? This cannot be undone.` : ""}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMilestone.isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={confirmDelete}
							disabled={deleteMilestone.isPending}
						>
							{deleteMilestone.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

interface MilestoneFormDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	projectId: number
	milestone?: ProjectMilestone
}

function MilestoneFormDialog({
	open,
	onOpenChange,
	projectId,
	milestone,
}: MilestoneFormDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				{open ? (
					<MilestoneForm
						projectId={projectId}
						milestone={milestone}
						onClose={() => onOpenChange(false)}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	)
}

function MilestoneForm({
	projectId,
	milestone,
	onClose,
}: {
	projectId: number
	milestone?: ProjectMilestone
	onClose: () => void
}) {
	const isEdit = Boolean(milestone)
	const createMilestone = useCreateMilestoneMutation()
	const updateMilestone = useUpdateMilestoneMutation()

	const [name, setName] = useState(milestone?.name ?? "")
	const [dueDate, setDueDate] = useState(toDateInputValue(milestone?.dueDate))
	const [status, setStatus] = useState<MilestoneStatus>(milestone?.status ?? "pending")
	const [progress, setProgress] = useState(String(milestone?.progress ?? 0))
	const [formError, setFormError] = useState<string | null>(null)

	const isPending = createMilestone.isPending || updateMilestone.isPending

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()
		setFormError(null)

		const trimmed = name.trim()
		if (!trimmed) {
			setFormError("Name is required")
			return
		}
		const progressValue = Math.max(0, Math.min(100, Number(progress) || 0))

		try {
			if (isEdit && milestone) {
				await updateMilestone.mutateAsync({
					id: milestone.id,
					name: trimmed,
					dueDate: dueDate ? new Date(dueDate) : null,
					status,
					progress: progressValue,
				})
				toast.success("Milestone updated")
			} else {
				await createMilestone.mutateAsync({
					projectId,
					name: trimmed,
					dueDate: dueDate ? new Date(dueDate) : null,
					status,
					progress: progressValue,
				})
				toast.success("Milestone created")
			}
			onClose()
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to save milestone"
			setFormError(message)
			toast.error(message)
		}
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>{isEdit ? "Edit milestone" : "New milestone"}</DialogTitle>
				<DialogDescription>Plan a checkpoint for this project.</DialogDescription>
			</DialogHeader>

			<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
				<Field data-invalid={Boolean(formError)}>
					<FieldLabel htmlFor="milestone-name">Name</FieldLabel>
					<Input
						id="milestone-name"
						value={name}
						onChange={e => setName(e.target.value)}
						disabled={isPending}
						aria-invalid={Boolean(formError)}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="milestone-due">Due date</FieldLabel>
					<Input
						id="milestone-due"
						type="date"
						value={dueDate}
						onChange={e => setDueDate(e.target.value)}
						disabled={isPending}
					/>
				</Field>

				<Field>
					<FieldLabel>Status</FieldLabel>
					<Select
						value={status}
						onValueChange={value => setStatus(value as MilestoneStatus)}
						disabled={isPending}
					>
						<SelectTrigger className="w-full">
							<SelectValue>
								{value => MILESTONE_STATUS_LABELS[(value as MilestoneStatus) ?? "pending"]}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{STATUS_OPTIONS.map(option => (
								<SelectItem key={option} value={option}>
									{MILESTONE_STATUS_LABELS[option]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<Field>
					<FieldLabel htmlFor="milestone-progress">Progress (%)</FieldLabel>
					<Input
						id="milestone-progress"
						type="number"
						min={0}
						max={100}
						value={progress}
						onChange={e => setProgress(e.target.value)}
						disabled={isPending}
					/>
				</Field>

				{formError ? <FieldError>{formError}</FieldError> : null}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
						Cancel
					</Button>
					<Button type="submit" disabled={isPending}>
						{isPending ? "Saving..." : isEdit ? "Save changes" : "Create milestone"}
					</Button>
				</DialogFooter>
			</form>
		</>
	)
}
