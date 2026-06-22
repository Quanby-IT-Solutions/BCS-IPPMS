"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"

import type { Project } from "@repo/contracts"

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
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { canAccess, type AccessProfile } from "@/features/dashboard/lib/access"
import { useDivisionsQuery } from "@/features/divisions/api/divisions.hooks"
import {
	useActivateProjectMutation,
	useProjectApprovalQuery,
	useSubmitProjectMutation,
} from "@/features/projects/api/projects.hooks"
import { ApprovalStatusTracker } from "@/features/projects/components/approval-status-tracker"
import { ProjectAttachments } from "@/features/projects/components/project-attachments"
import { formatDateTime } from "@/features/projects/lib/project-format"
import { useUsersQuery } from "@/features/user-management/api/rbac.hooks"

interface ProjectOverviewTabProps {
	project: Project
	access: AccessProfile
}

export function ProjectOverviewTab({ project, access }: ProjectOverviewTabProps) {
	const { data: approval, isLoading, isError, error, refetch } = useProjectApprovalQuery(project.id)
	const { data: divisions } = useDivisionsQuery()
	const { data: users } = useUsersQuery()

	const submit = useSubmitProjectMutation()
	const activate = useActivateProjectMutation()

	const [confirm, setConfirm] = useState<"submit" | "activate" | null>(null)

	const divisionName = useMemo(() => {
		if (project.divisionId === null) return "—"
		const found = (divisions ?? []).find(d => d.id === project.divisionId)
		return found?.name ?? `Division #${project.divisionId}`
	}, [divisions, project.divisionId])

	const creatorName = useMemo(() => {
		const found = (users ?? []).find(u => u.id === project.createdBy)
		return found ? (found.name ?? found.email) : project.createdBy
	}, [users, project.createdBy])

	const canSubmit = canAccess(access, { requiredPermission: "projects:submit" })
	const canActivate = canAccess(access, { requiredPermission: "projects:update" })

	async function handleConfirm() {
		try {
			if (confirm === "submit") {
				await submit.mutateAsync(project.id)
				toast.success("Submitted for approval")
			} else if (confirm === "activate") {
				await activate.mutateAsync(project.id)
				toast.success("Project activated")
			}
			setConfirm(null)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Action failed")
			setConfirm(null)
		}
	}

	const busy = submit.isPending || activate.isPending

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Summary</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="grid grid-cols-2 gap-3 text-sm">
							<div className="col-span-2">
								<dt className="text-muted-foreground text-xs">Title</dt>
								<dd>{project.title}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground text-xs">Division</dt>
								<dd>{divisionName}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground text-xs">Created by</dt>
								<dd>{creatorName}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground text-xs">Created</dt>
								<dd>{formatDateTime(project.createdAt)}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground text-xs">Updated</dt>
								<dd>{formatDateTime(project.updatedAt)}</dd>
							</div>
						</dl>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<CardTitle>Approval</CardTitle>
							<div className="flex gap-2">
								{project.status === "draft" && canSubmit ? (
									<Button size="sm" onClick={() => setConfirm("submit")} disabled={busy}>
										Submit for approval
									</Button>
								) : null}
								{project.status === "in_approval" && canActivate ? (
									<Button size="sm" onClick={() => setConfirm("activate")} disabled={busy}>
										Activate
									</Button>
								) : null}
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<ApprovalStatusTracker
							approval={approval ?? undefined}
							projectStatus={project.status}
							isLoading={isLoading}
							isError={isError}
							errorMessage={error instanceof Error ? error.message : undefined}
							onRetry={() => refetch()}
						/>
					</CardContent>
				</Card>
			</div>

			<ProjectAttachments project={project} access={access} />

			<AlertDialog open={confirm !== null} onOpenChange={open => !open && setConfirm(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{confirm === "submit" ? "Submit for approval" : "Activate project"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{confirm === "submit"
								? "This routes the proposal into the division approval chain and locks it into In Approval."
								: "Activation requires the latest approval to be approved. The project becomes Active."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirm} disabled={busy}>
							{busy ? "Working..." : "Confirm"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
