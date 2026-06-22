"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
	CheckmarkBadge01Icon,
	Download04Icon,
	File01Icon,
	InboxIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import type {
	ApprovalActionType,
	ApprovalModule,
	ApprovalRequestSummary,
	ApprovalStatus,
	FileMetadata,
} from "@repo/contracts"

import { PageHeader } from "@/core/components/page-header"
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
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/core/components/ui/field"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Textarea } from "@/core/components/ui/textarea"
import {
	downloadApprovalFile,
	useActOnRequestMutation,
	useApprovalInboxQuery,
	useApprovalRequestQuery,
	useApprovalSubjectFilesQuery,
} from "@/features/approvals/api/approvals.hooks"
import { canAccess, type AccessProfile } from "@/features/dashboard/lib/access"
import { useDivisionsQuery } from "@/features/divisions/api/divisions.hooks"
import { useUsersQuery } from "@/features/user-management/api/rbac.hooks"

const SUBJECT_LABELS: Record<ApprovalModule, string> = {
	projects: "Project",
	job_orders: "Job Order",
}

const ACTION_LABELS: Record<ApprovalActionType, string> = {
	approve: "Approve",
	reject: "Reject",
	delegate: "Delegate",
	escalate: "Escalate",
}

const ACTION_PAST_LABELS: Record<ApprovalActionType, string> = {
	approve: "approved",
	reject: "rejected",
	delegate: "delegated",
	escalate: "escalated",
}

function statusBadgeVariant(status: ApprovalStatus): "default" | "secondary" | "destructive" {
	if (status === "approved") return "default"
	if (status === "rejected") return "destructive"
	return "secondary"
}

function formatDate(value: Date | string) {
	// Contract types this as Date, but the oRPC client does not re-run the
	// schema transform, so at runtime it arrives as an ISO string. Coerce.
	return new Date(value).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	})
}

function subjectLabel(summary: Pick<ApprovalRequestSummary, "module" | "subjectId">) {
	return `${SUBJECT_LABELS[summary.module]} #${summary.subjectId}`
}

interface ApprovalsInboxViewProps {
	access: AccessProfile
}

export function ApprovalsInboxView({ access }: ApprovalsInboxViewProps) {
	const searchParams = useSearchParams()
	const requestParam = searchParams.get("request")

	const { data: inbox, isLoading, isError, error, refetch } = useApprovalInboxQuery()
	const { data: divisions } = useDivisionsQuery()

	// Deep link: the dashboard widget links to /approvals?request=<id>. Seed the
	// initial selection from it (once, at mount) without an effect.
	const deepLinkId = useMemo(() => {
		const parsed = Number(requestParam)
		return requestParam && Number.isFinite(parsed) && parsed > 0 ? parsed : null
	}, [requestParam])

	const [selectedId, setSelectedId] = useState<number | null>(deepLinkId)

	// Derived active selection: explicit pick wins, else fall back to the first
	// inbox item once the list loads. Avoids syncing state inside an effect.
	const activeId = selectedId ?? inbox?.[0]?.id ?? null

	const divisionName = useMemo(() => {
		const map = new Map<number, string>()
		for (const d of divisions ?? []) {
			map.set(d.id, d.name)
		}
		return (id: number | null) => (id !== null ? (map.get(id) ?? `Division #${id}`) : "—")
	}, [divisions])

	function handleActed(actedId: number) {
		const next = (inbox ?? []).find(item => item.id !== actedId)
		setSelectedId(next ? next.id : null)
	}

	return (
		<section className="flex w-full flex-col gap-6">
			<PageHeader
				icon={CheckmarkBadge01Icon}
				title="My Approvals"
				description="Review and act on requests awaiting your decision."
			/>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
				<div className="flex flex-col gap-3">
					{isLoading ? (
						<div className="flex flex-col gap-2">
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
						</div>
					) : null}

					{isError ? (
						<div className="flex flex-col items-start gap-2">
							<p className="text-destructive text-sm">
								{error instanceof Error ? error.message : "Failed to load your inbox"}
							</p>
							<Button size="sm" variant="outline" onClick={() => refetch()}>
								Retry
							</Button>
						</div>
					) : null}

					{inbox && inbox.length > 0
						? inbox.map(item => (
								<button
									key={item.id}
									type="button"
									onClick={() => setSelectedId(item.id)}
									className={`flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors ${
										activeId === item.id ? "border-primary bg-accent/40" : "hover:bg-accent/40"
									}`}
								>
									<div className="flex items-center justify-between gap-2">
										<span className="font-medium">{subjectLabel(item)}</span>
										<Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
									</div>
									<span className="text-muted-foreground text-xs">
										{divisionName(item.divisionId)} · Level {item.currentStepOrder}
										{item.currentStepRoleName ? ` · ${item.currentStepRoleName}` : ""}
									</span>
									<span className="text-muted-foreground text-xs">
										{formatDate(item.createdAt)}
									</span>
								</button>
							))
						: null}

					{inbox && inbox.length === 0 ? (
						<Empty className="border">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<HugeiconsIcon icon={InboxIcon} strokeWidth={2} />
								</EmptyMedia>
								<EmptyTitle>You are all caught up</EmptyTitle>
								<EmptyDescription>Nothing to approve right now.</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : null}
				</div>

				<div>
					{activeId !== null ? (
						<ReviewPanel
							key={activeId}
							requestId={activeId}
							divisionName={divisionName}
							onActed={handleActed}
							access={access}
						/>
					) : (
						<Empty className="h-full border">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<HugeiconsIcon icon={CheckmarkBadge01Icon} strokeWidth={2} />
								</EmptyMedia>
								<EmptyTitle>No request selected</EmptyTitle>
								<EmptyDescription>Select a request from the list to review it.</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}
				</div>
			</div>
		</section>
	)
}

interface ReviewPanelProps {
	requestId: number
	divisionName: (id: number | null) => string
	onActed: (actedId: number) => void
	access: AccessProfile
}

function ReviewPanel({ requestId, divisionName, onActed, access }: ReviewPanelProps) {
	const { data: request, isLoading, isError, error, refetch } = useApprovalRequestQuery(requestId)
	const { data: users } = useUsersQuery()
	const actOnRequest = useActOnRequestMutation()

	const isProjectSubject = request?.subjectType === "project" || request?.module === "projects"
	const canReadFiles = canAccess(access, { requiredPermission: "files:read" })
	const filesEnabled = Boolean(isProjectSubject && canReadFiles && request)
	const {
		data: files,
		isLoading: filesLoading,
		isError: filesError,
		refetch: refetchFiles,
	} = useApprovalSubjectFilesQuery(
		request ? { ownerType: request.subjectType, ownerId: request.subjectId } : null,
		filesEnabled
	)

	async function handleDownload(file: Pick<FileMetadata, "id" | "originalName">) {
		try {
			await downloadApprovalFile(file)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Download failed")
		}
	}

	const [action, setAction] = useState<ApprovalActionType | null>(null)
	const [note, setNote] = useState("")
	const [delegateToUserId, setDelegateToUserId] = useState("")
	const [inlineError, setInlineError] = useState<string | null>(null)
	const [confirmOpen, setConfirmOpen] = useState(false)

	const userName = useMemo(() => {
		const map = new Map<string, string>()
		for (const u of users ?? []) {
			map.set(u.id, u.name ?? u.email)
		}
		return (id: string) => map.get(id) ?? id
	}, [users])

	// Delegate candidates: active users only, and division-eligible — same
	// division as the request, or any active user when the request has no
	// division. The full `users` list still backs `userName` so requester and
	// history actors resolve even when outside this candidate set.
	const delegateCandidates = useMemo(() => {
		const requestDivisionId = request?.divisionId ?? null
		return (users ?? []).filter(user => {
			if (!user.isActive) return false
			if (requestDivisionId === null) return true
			return user.divisionId === requestDivisionId
		})
	}, [users, request?.divisionId])
	const hasDelegateCandidates = delegateCandidates.length > 0

	function resetForm() {
		setAction(null)
		setNote("")
		setDelegateToUserId("")
		setInlineError(null)
	}

	function validate(): boolean {
		if (!action) {
			setInlineError("Select an action")
			return false
		}
		if ((action === "reject" || action === "escalate") && !note.trim()) {
			setInlineError(`A note is required when you ${action} a request`)
			return false
		}
		if (action === "delegate" && !hasDelegateCandidates) {
			setInlineError("No eligible users in this division to delegate to")
			return false
		}
		if (action === "delegate" && !delegateToUserId.trim()) {
			setInlineError("A delegate target user is required")
			return false
		}
		setInlineError(null)
		return true
	}

	function handleSubmit() {
		if (validate()) {
			setConfirmOpen(true)
		}
	}

	async function confirmSubmit() {
		if (!action) return
		try {
			await actOnRequest.mutateAsync({
				id: requestId,
				action,
				note: note.trim() || undefined,
				delegateToUserId: action === "delegate" ? delegateToUserId : undefined,
			})
			toast.success(`Request ${ACTION_PAST_LABELS[action]}`)
			setConfirmOpen(false)
			resetForm()
			onActed(requestId)
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to submit action"
			setInlineError(message)
			toast.error(message)
		}
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-40" />
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-20 w-full" />
				</CardContent>
			</Card>
		)
	}

	if (isError || !request) {
		return (
			<Card>
				<CardContent className="flex flex-col items-start gap-2 pt-6">
					<p className="text-destructive text-sm">
						{error instanceof Error ? error.message : "Failed to load the request"}
					</p>
					<Button size="sm" variant="outline" onClick={() => refetch()}>
						Retry
					</Button>
				</CardContent>
			</Card>
		)
	}

	const isPending = request.status === "pending"
	const totalSteps = request.steps.length
	const orderedSteps = request.steps.slice().sort((a, b) => a.stepOrder - b.stepOrder)
	const orderedActions = request.actions.slice().sort((a, b) => a.stepOrder - b.stepOrder)
	const blockDelegate = action === "delegate" && !hasDelegateCandidates

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<CardTitle>{subjectLabel(request)}</CardTitle>
					<Badge variant={statusBadgeVariant(request.status)}>{request.status}</Badge>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				<dl className="grid grid-cols-2 gap-3 text-sm">
					<div>
						<dt className="text-muted-foreground text-xs">Module</dt>
						<dd>{SUBJECT_LABELS[request.module]}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground text-xs">Division</dt>
						<dd>{divisionName(request.divisionId)}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground text-xs">Requester</dt>
						<dd>{userName(request.requestedBy)}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground text-xs">Current step</dt>
						<dd>
							{isPending ? `Level ${request.currentStepOrder} of ${totalSteps}` : "Finalized"}
						</dd>
					</div>
				</dl>

				{isProjectSubject && canReadFiles ? (
					<div className="flex flex-col gap-2">
						<h3 className="text-sm font-medium">Attachments</h3>

						{filesLoading ? <Skeleton className="h-10 w-full" /> : null}

						{filesError ? (
							<div className="flex flex-col items-start gap-2">
								<p className="text-destructive text-sm">Unable to load attachments.</p>
								<Button size="sm" variant="outline" onClick={() => refetchFiles()}>
									Retry
								</Button>
							</div>
						) : null}

						{!filesLoading && !filesError && files && files.length > 0
							? files.map(file => (
									<div
										key={file.id}
										className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
									>
										<div className="flex min-w-0 items-center gap-2">
											<HugeiconsIcon
												icon={File01Icon}
												strokeWidth={2}
												className="size-4 shrink-0"
											/>
											<span className="truncate">{file.originalName}</span>
											<span className="text-muted-foreground shrink-0 text-xs">
												{formatDate(file.createdAt)}
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

						{!filesLoading && !filesError && files && files.length === 0 ? (
							<Empty className="border">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<HugeiconsIcon icon={File01Icon} strokeWidth={2} />
									</EmptyMedia>
									<EmptyTitle>No attachments</EmptyTitle>
									<EmptyDescription>This request has no supporting files.</EmptyDescription>
								</EmptyHeader>
							</Empty>
						) : null}
					</div>
				) : null}

				<div className="flex flex-col gap-2">
					<h3 className="text-sm font-medium">Approval chain</h3>
					<ol className="flex flex-col gap-1.5">
						{orderedSteps.map(step => {
							const isCurrent = isPending && step.stepOrder === request.currentStepOrder
							return (
								<li key={step.id} className="flex items-center gap-2 text-sm">
									<span
										className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
											isCurrent
												? "bg-primary text-primary-foreground"
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
				</div>

				<div className="flex flex-col gap-2">
					<h3 className="text-sm font-medium">History</h3>
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
									<p className="text-muted-foreground text-xs">{formatDate(record.createdAt)}</p>
								</li>
							))}
						</ul>
					) : (
						<p className="text-muted-foreground text-sm">No actions recorded yet.</p>
					)}
				</div>

				{isPending ? (
					<div className="flex flex-col gap-4 border-t pt-4">
						<div className="flex flex-wrap gap-2">
							{(Object.keys(ACTION_LABELS) as ApprovalActionType[]).map(act => (
								<Button
									key={act}
									type="button"
									size="sm"
									variant={action === act ? "default" : "outline"}
									onClick={() => {
										setAction(act)
										setInlineError(null)
									}}
									disabled={actOnRequest.isPending}
								>
									{ACTION_LABELS[act]}
								</Button>
							))}
						</div>

						{action === "delegate" ? (
							<Field>
								<FieldLabel>Delegate to</FieldLabel>
								{hasDelegateCandidates ? (
									<Select
										value={delegateToUserId || null}
										onValueChange={value => setDelegateToUserId(String(value))}
										disabled={actOnRequest.isPending}
									>
										<SelectTrigger className="w-full">
											<SelectValue>
												{value => (value ? userName(String(value)) : "Select a user")}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{delegateCandidates.map(user => (
												<SelectItem key={user.id} value={user.id}>
													{user.name ?? user.email}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : (
									<p className="text-muted-foreground text-sm">
										No eligible users in this division to delegate to.
									</p>
								)}
							</Field>
						) : null}

						{action ? (
							<Field>
								<FieldLabel htmlFor="action-note">
									Note
									{action === "reject" || action === "escalate" ? " (required)" : " (optional)"}
								</FieldLabel>
								<Textarea
									id="action-note"
									value={note}
									onChange={e => setNote(e.target.value)}
									placeholder="Add context for this decision"
									rows={3}
									disabled={actOnRequest.isPending}
								/>
							</Field>
						) : null}

						{inlineError ? <FieldError>{inlineError}</FieldError> : null}

						<div className="flex justify-end">
							<Button
								type="button"
								onClick={handleSubmit}
								disabled={!action || actOnRequest.isPending || blockDelegate}
							>
								Submit
							</Button>
						</div>
					</div>
				) : (
					<div className="border-t pt-4 text-sm">
						<p className="text-muted-foreground">
							This request was <span className="text-foreground font-medium">{request.status}</span>
							. No further action is needed.
						</p>
					</div>
				)}
			</CardContent>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{action ? `${ACTION_LABELS[action]} request` : "Confirm action"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{action === "delegate"
								? `Delegate ${subjectLabel(request)} to ${userName(delegateToUserId)}?`
								: action
									? `${ACTION_LABELS[action]} ${subjectLabel(request)}? This cannot be undone.`
									: ""}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={actOnRequest.isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmSubmit} disabled={actOnRequest.isPending}>
							{actOnRequest.isPending ? "Submitting..." : "Confirm"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	)
}
