"use client"

import { useState } from "react"
import { toast } from "sonner"

import type { MilestoneStatus, Project, ProjectMilestone } from "@repo/contracts"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
	useMilestonesQuery,
	useSetMilestoneProgressMutation,
	useSetMilestoneStatusMutation,
} from "@/features/projects/api/projects.hooks"
import { ProjectAttachments } from "@/features/projects/components/project-attachments"
import {
	formatDate,
	isOverdue,
	MILESTONE_STATUS_LABELS,
	MILESTONE_STATUS_VARIANTS,
} from "@/features/projects/lib/project-format"

const STATUS_OPTIONS: readonly MilestoneStatus[] = ["pending", "in_progress", "done"]

interface ProjectExecutionTabProps {
	project: Project
	access: AccessProfile
}

export function ProjectExecutionTab({ project, access }: ProjectExecutionTabProps) {
	const { data: milestones, isLoading, isError, error, refetch } = useMilestonesQuery(project.id)

	const readOnly =
		project.status === "closed" ||
		!canAccess(access, { requiredPermission: "project-milestones:update" })

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Milestone progress</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
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

					{milestones && milestones.length > 0
						? milestones.map(milestone => (
								<MilestoneTrackerRow key={milestone.id} milestone={milestone} readOnly={readOnly} />
							))
						: null}

					{milestones && milestones.length === 0 ? (
						<p className="text-muted-foreground text-sm">No milestones to track yet.</p>
					) : null}
				</CardContent>
			</Card>

			<ProjectAttachments project={project} access={access} />
		</div>
	)
}

function MilestoneTrackerRow({
	milestone,
	readOnly,
}: {
	milestone: ProjectMilestone
	readOnly: boolean
}) {
	const setStatus = useSetMilestoneStatusMutation()
	const setProgress = useSetMilestoneProgressMutation()
	const [progressDraft, setProgressDraft] = useState(String(milestone.progress))

	const overdue = isOverdue(milestone.dueDate, milestone.status === "done")
	const busy = setStatus.isPending || setProgress.isPending

	async function applyStatus(status: MilestoneStatus) {
		try {
			await setStatus.mutateAsync({ id: milestone.id, status })
			toast.success("Status updated")
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update status")
		}
	}

	async function applyProgress() {
		const value = Math.max(0, Math.min(100, Number(progressDraft) || 0))
		try {
			await setProgress.mutateAsync({ id: milestone.id, progress: value })
			toast.success("Progress updated")
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update progress")
		}
	}

	return (
		<div className="flex flex-col gap-3 rounded-lg border p-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
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
					{overdue ? <Badge variant="destructive">Overdue</Badge> : null}
				</div>
			</div>

			<div className="flex items-center gap-3">
				<Progress value={milestone.progress} className="h-2" />
				<span className="text-muted-foreground w-10 text-right text-xs">{milestone.progress}%</span>
			</div>

			{!readOnly ? (
				<div className="flex flex-wrap items-end gap-3">
					<div className="flex flex-col gap-1">
						<label className="text-muted-foreground text-xs" htmlFor={`status-${milestone.id}`}>
							Status
						</label>
						<Select
							value={milestone.status}
							onValueChange={value => applyStatus(value as MilestoneStatus)}
							disabled={busy}
						>
							<SelectTrigger id={`status-${milestone.id}`} className="h-8 w-36 text-xs">
								<SelectValue>
									{value => MILESTONE_STATUS_LABELS[(value as MilestoneStatus) ?? milestone.status]}
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
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-muted-foreground text-xs" htmlFor={`progress-${milestone.id}`}>
							Progress (%)
						</label>
						<Input
							id={`progress-${milestone.id}`}
							type="number"
							min={0}
							max={100}
							value={progressDraft}
							onChange={e => setProgressDraft(e.target.value)}
							className="h-8 w-24"
							disabled={busy}
						/>
					</div>
					<Button type="button" size="sm" variant="outline" onClick={applyProgress} disabled={busy}>
						Update progress
					</Button>
				</div>
			) : null}
		</div>
	)
}
