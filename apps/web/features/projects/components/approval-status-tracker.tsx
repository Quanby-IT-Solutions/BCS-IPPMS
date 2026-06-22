"use client"

import { useMemo } from "react"

import type { ApprovalActionType, ProjectApprovalStatus, ProjectStatus } from "@repo/contracts"

import { Badge } from "@/core/components/ui/badge"
import { Skeleton } from "@/core/components/ui/skeleton"
import { formatDateTime } from "@/features/projects/lib/project-format"
import { useUsersQuery } from "@/features/user-management/api/rbac.hooks"

const ACTION_LABELS: Record<ApprovalActionType, string> = {
	approve: "Approve",
	reject: "Reject",
	delegate: "Delegate",
	escalate: "Escalate",
}

function statusBadgeVariant(
	status: NonNullable<ProjectApprovalStatus>["status"]
): "default" | "secondary" | "destructive" {
	if (status === "approved") return "default"
	if (status === "rejected") return "destructive"
	return "secondary"
}

interface ApprovalStatusTrackerProps {
	approval: ProjectApprovalStatus | undefined
	projectStatus: ProjectStatus
	isLoading: boolean
	isError: boolean
	errorMessage?: string
	onRetry?: () => void
}

export function ApprovalStatusTracker({
	approval,
	projectStatus,
	isLoading,
	isError,
	errorMessage,
	onRetry,
}: ApprovalStatusTrackerProps) {
	const { data: users } = useUsersQuery()

	const userName = useMemo(() => {
		const map = new Map<string, string>()
		for (const u of users ?? []) {
			map.set(u.id, u.name ?? u.email)
		}
		return (id: string) => map.get(id) ?? id
	}, [users])

	if (isLoading) {
		return (
			<div className="flex flex-col gap-3">
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-3/4" />
			</div>
		)
	}

	if (isError) {
		return (
			<div className="flex flex-col items-start gap-2">
				<p className="text-destructive text-sm">
					{errorMessage ?? "Failed to load approval status"}
				</p>
				{onRetry ? (
					<button
						type="button"
						onClick={onRetry}
						className="text-primary text-sm underline-offset-4 hover:underline"
					>
						Retry
					</button>
				) : null}
			</div>
		)
	}

	if (!approval) {
		return (
			<div className="rounded-lg border border-dashed p-4 text-sm">
				<p className="font-medium">Not submitted</p>
				<p className="text-muted-foreground">
					{projectStatus === "draft"
						? "Submit this proposal to route it into the division approval chain."
						: "No approval request exists for this project yet."}
				</p>
			</div>
		)
	}

	const isPending = approval.status === "pending"
	const totalSteps = approval.steps.length
	const orderedSteps = approval.steps.slice().sort((a, b) => a.stepOrder - b.stepOrder)
	const orderedActions = approval.actions.slice().sort((a, b) => a.stepOrder - b.stepOrder)

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="text-sm font-medium">Approval status</h3>
				<Badge variant={statusBadgeVariant(approval.status)}>{approval.status}</Badge>
			</div>

			<div className="flex flex-col gap-2">
				<h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					Approval chain
				</h4>
				<ol className="flex flex-col gap-1.5">
					{orderedSteps.map(step => {
						const isCurrent = isPending && step.stepOrder === approval.currentStepOrder
						const isPast =
							step.stepOrder < approval.currentStepOrder || approval.status === "approved"
						return (
							<li key={step.id} className="flex items-center gap-2 text-sm">
								<span
									className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
										isCurrent
											? "bg-primary text-primary-foreground"
											: isPast
												? "bg-primary/20 text-foreground"
												: "bg-muted text-muted-foreground"
									}`}
								>
									{step.stepOrder}
								</span>
								<span>{step.approverRoleName ?? `Role #${step.approverRoleId}`}</span>
								{isCurrent ? (
									<Badge variant="outline" className="ml-auto">
										Current
									</Badge>
								) : null}
							</li>
						)
					})}
				</ol>
				{isPending ? (
					<p className="text-muted-foreground text-xs">
						Level {approval.currentStepOrder} of {totalSteps}
					</p>
				) : null}
			</div>

			<div className="flex flex-col gap-2">
				<h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					History
				</h4>
				{orderedActions.length > 0 ? (
					<ul className="flex flex-col gap-3">
						{orderedActions.map(record => (
							<li key={record.id} className="border-l-2 pl-3 text-sm">
								<div className="flex flex-wrap items-center gap-2">
									<span className="font-medium">{ACTION_LABELS[record.action]}</span>
									<span className="text-muted-foreground text-xs">
										by {userName(record.actorId)} · Level {record.stepOrder}
									</span>
								</div>
								{record.delegateToUserId ? (
									<p className="text-muted-foreground text-xs">
										To {userName(record.delegateToUserId)}
									</p>
								) : null}
								{record.note ? <p className="text-muted-foreground">{record.note}</p> : null}
								<p className="text-muted-foreground text-xs">{formatDateTime(record.createdAt)}</p>
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">No actions recorded yet.</p>
				)}
			</div>
		</div>
	)
}
