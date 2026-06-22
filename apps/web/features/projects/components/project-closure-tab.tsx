"use client"

import { useState } from "react"
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
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Switch } from "@/core/components/ui/switch"
import { Textarea } from "@/core/components/ui/textarea"
import { canAccess, type AccessProfile } from "@/features/dashboard/lib/access"
import { useClosureQuery, useSubmitClosureMutation } from "@/features/projects/api/projects.hooks"
import { formatDateTime } from "@/features/projects/lib/project-format"

interface ProjectClosureTabProps {
	project: Project
	access: AccessProfile
}

export function ProjectClosureTab({ project, access }: ProjectClosureTabProps) {
	const isClosed = project.status === "closed"
	const closureQuery = useClosureQuery(project.id, isClosed)
	const submitClosure = useSubmitClosureMutation()

	const [outcomeSummary, setOutcomeSummary] = useState("")
	const [objectivesMet, setObjectivesMet] = useState(true)
	const [performanceRating, setPerformanceRating] = useState("")
	const [lessonsLearned, setLessonsLearned] = useState("")
	const [formError, setFormError] = useState<string | null>(null)
	const [confirmOpen, setConfirmOpen] = useState(false)

	const canClose = canAccess(access, { requiredPermission: "projects:close" })

	async function handleClose() {
		setFormError(null)
		const rating = performanceRating ? Number(performanceRating) : null
		if (rating !== null && (Number.isNaN(rating) || rating < 0 || rating > 100)) {
			setFormError("Performance rating must be between 0 and 100")
			setConfirmOpen(false)
			return
		}

		try {
			await submitClosure.mutateAsync({
				projectId: project.id,
				outcomeSummary: outcomeSummary.trim() || null,
				objectivesMet,
				performanceRating: rating,
				lessonsLearned: lessonsLearned.trim() || null,
			})
			toast.success("Project closed")
			setConfirmOpen(false)
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to close project"
			setFormError(message)
			toast.error(message)
			setConfirmOpen(false)
		}
	}

	// ---- Closed: show the saved closure read-only ----------------------------
	if (isClosed) {
		const closure = closureQuery.data
		return (
			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<CardTitle>Closure report</CardTitle>
						<Badge variant="secondary">Closed</Badge>
					</div>
				</CardHeader>
				<CardContent>
					{closureQuery.isLoading ? (
						<div className="flex flex-col gap-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					) : closure ? (
						<dl className="grid gap-3 text-sm">
							<div>
								<dt className="text-muted-foreground text-xs">Outcome summary</dt>
								<dd className="whitespace-pre-wrap">{closure.outcomeSummary ?? "—"}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground text-xs">Objectives met</dt>
								<dd>
									{closure.objectivesMet === null ? "—" : closure.objectivesMet ? "Yes" : "No"}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground text-xs">Performance rating</dt>
								<dd>
									{closure.performanceRating === null ? "—" : `${closure.performanceRating}%`}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground text-xs">Lessons learned</dt>
								<dd className="whitespace-pre-wrap">{closure.lessonsLearned ?? "—"}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground text-xs">Closed</dt>
								<dd>{formatDateTime(closure.closedAt)}</dd>
							</div>
						</dl>
					) : (
						<p className="text-muted-foreground text-sm">No closure report recorded.</p>
					)}
				</CardContent>
			</Card>
		)
	}

	// ---- Not active yet: closure unavailable ---------------------------------
	if (project.status !== "active") {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Closure</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						A project can only be closed once it is Active.
					</p>
				</CardContent>
			</Card>
		)
	}

	// ---- Active: closure form ------------------------------------------------
	return (
		<Card>
			<CardHeader>
				<CardTitle>Close project</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					className="flex max-w-2xl flex-col gap-4"
					onSubmit={e => {
						e.preventDefault()
						setConfirmOpen(true)
					}}
				>
					<Field>
						<FieldLabel htmlFor="closure-summary">Outcome summary</FieldLabel>
						<Textarea
							id="closure-summary"
							value={outcomeSummary}
							onChange={e => setOutcomeSummary(e.target.value)}
							rows={3}
							disabled={submitClosure.isPending}
						/>
					</Field>

					<Field orientation="horizontal">
						<Switch
							id="closure-objectives"
							checked={objectivesMet}
							onCheckedChange={setObjectivesMet}
							disabled={submitClosure.isPending}
						/>
						<FieldLabel htmlFor="closure-objectives">Objectives met</FieldLabel>
					</Field>

					<Field>
						<FieldLabel htmlFor="closure-rating">Performance rating (0–100)</FieldLabel>
						<Input
							id="closure-rating"
							type="number"
							min={0}
							max={100}
							value={performanceRating}
							onChange={e => setPerformanceRating(e.target.value)}
							disabled={submitClosure.isPending}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="closure-lessons">Lessons learned</FieldLabel>
						<Textarea
							id="closure-lessons"
							value={lessonsLearned}
							onChange={e => setLessonsLearned(e.target.value)}
							rows={3}
							disabled={submitClosure.isPending}
						/>
					</Field>

					{formError ? <FieldError>{formError}</FieldError> : null}

					{canClose ? (
						<div className="flex justify-end">
							<Button type="submit" variant="destructive" disabled={submitClosure.isPending}>
								Close Project
							</Button>
						</div>
					) : (
						<p className="text-muted-foreground text-sm">
							You do not have permission to close this project.
						</p>
					)}
				</form>

				<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Close project</AlertDialogTitle>
							<AlertDialogDescription>
								Closing &ldquo;{project.title}&rdquo; archives it as read-only. This cannot be
								undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={submitClosure.isPending}>Cancel</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={handleClose}
								disabled={submitClosure.isPending}
							>
								{submitClosure.isPending ? "Closing..." : "Close project"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardContent>
		</Card>
	)
}
