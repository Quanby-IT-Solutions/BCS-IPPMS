"use client"

import { useMemo, useState } from "react"
import { Add01Icon, Delete02Icon, KanbanIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import type { ProjectTask, TaskStatus } from "@repo/contracts"

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Textarea } from "@/core/components/ui/textarea"
import { canAccess, type AccessProfile } from "@/features/dashboard/lib/access"
import {
	useAssignTaskMutation,
	useCreateTaskMutation,
	useDeleteTaskMutation,
	useProjectsQuery,
	useSetTaskStatusMutation,
	useTasksQuery,
} from "@/features/projects/api/projects.hooks"
import {
	formatDate,
	isOverdue,
	TASK_STATUS_LABELS,
	TASK_STATUS_ORDER,
} from "@/features/projects/lib/project-format"
import { useUsersQuery } from "@/features/user-management/api/rbac.hooks"

const UNASSIGNED = "__unassigned__"

interface TaskBoardProps {
	access: AccessProfile
	/** Fixed project id (project hub) or undefined for the division-scoped global board. */
	projectId?: number
	/** Disables all mutations (e.g. closed projects). */
	readOnly?: boolean
}

export function TaskBoard({ access, projectId, readOnly = false }: TaskBoardProps) {
	const isGlobal = projectId === undefined
	const filters = useMemo(() => (isGlobal ? undefined : { projectId }), [isGlobal, projectId])

	const { data: tasks, isLoading, isError, error, refetch } = useTasksQuery(filters)
	const { data: users } = useUsersQuery()
	const [createOpen, setCreateOpen] = useState(false)
	const [toDelete, setToDelete] = useState<ProjectTask | null>(null)

	const assignTask = useAssignTaskMutation()
	const setStatus = useSetTaskStatusMutation()
	const deleteTask = useDeleteTaskMutation()

	const userName = useMemo(() => {
		const map = new Map<string, string>()
		for (const u of users ?? []) {
			map.set(u.id, u.name ?? u.email)
		}
		return (id: string | null) => (id ? (map.get(id) ?? id) : "Unassigned")
	}, [users])

	const canCreate = canAccess(access, { requiredPermission: "project-tasks:create" })
	const canAssign = canAccess(access, { requiredPermission: "project-tasks:assign" })
	const canUpdate = canAccess(access, { requiredPermission: "project-tasks:update" })
	const canDelete = canAccess(access, { requiredPermission: "project-tasks:delete" })

	const columns = useMemo(() => {
		const grouped: Record<TaskStatus, ProjectTask[]> = { todo: [], in_progress: [], done: [] }
		for (const task of tasks ?? []) {
			grouped[task.status].push(task)
		}
		return grouped
	}, [tasks])

	async function handleAssign(task: ProjectTask, value: string) {
		try {
			await assignTask.mutateAsync({ id: task.id, assigneeId: value === UNASSIGNED ? null : value })
			toast.success("Task reassigned")
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to reassign task")
		}
	}

	async function handleMove(task: ProjectTask, status: TaskStatus) {
		if (task.status === status) return
		try {
			await setStatus.mutateAsync({ id: task.id, status })
			toast.success(`Moved to ${TASK_STATUS_LABELS[status]}`)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to move task")
		}
	}

	async function confirmDelete() {
		if (!toDelete) return
		try {
			await deleteTask.mutateAsync(toDelete.id)
			toast.success("Task deleted")
			setToDelete(null)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete task")
		}
	}

	const mutating = assignTask.isPending || setStatus.isPending || deleteTask.isPending

	return (
		<div className="flex flex-col gap-4">
			{!readOnly && canCreate ? (
				<div className="flex justify-end">
					<Button size="sm" onClick={() => setCreateOpen(true)}>
						<HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
						New Task
					</Button>
				</div>
			) : null}

			{isLoading ? (
				<div className="grid gap-4 md:grid-cols-3">
					<Skeleton className="h-40 w-full" />
					<Skeleton className="h-40 w-full" />
					<Skeleton className="h-40 w-full" />
				</div>
			) : null}

			{isError ? (
				<div className="flex flex-col items-start gap-2">
					<p className="text-destructive text-sm">
						{error instanceof Error ? error.message : "Failed to load tasks"}
					</p>
					<Button size="sm" variant="outline" onClick={() => refetch()}>
						Retry
					</Button>
				</div>
			) : null}

			{tasks && tasks.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<HugeiconsIcon icon={KanbanIcon} strokeWidth={2} />
						</EmptyMedia>
						<EmptyTitle>No tasks</EmptyTitle>
						<EmptyDescription>
							{!readOnly && canCreate
								? "Create a task to populate the board."
								: "Tasks will appear here once added."}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}

			{tasks && tasks.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-3">
					{TASK_STATUS_ORDER.map(status => (
						<div key={status} className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-3">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-medium">{TASK_STATUS_LABELS[status]}</h3>
								<Badge variant="secondary">{columns[status].length}</Badge>
							</div>
							<div className="flex flex-col gap-2">
								{columns[status].map(task => {
									const overdue = isOverdue(task.dueDate, task.status === "done")
									return (
										<div
											key={task.id}
											className="bg-background flex flex-col gap-2 rounded-md border p-3"
										>
											<div className="flex items-start justify-between gap-2">
												<p className="text-sm font-medium">{task.title}</p>
												{!readOnly && canDelete ? (
													<button
														type="button"
														onClick={() => setToDelete(task)}
														className="text-muted-foreground hover:text-destructive shrink-0"
														aria-label={`Delete ${task.title}`}
													>
														<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
													</button>
												) : null}
											</div>

											{task.requirements ? (
												<p className="text-muted-foreground line-clamp-2 text-xs">
													{task.requirements}
												</p>
											) : null}

											<div className="flex flex-wrap items-center gap-2 text-xs">
												<span className="text-muted-foreground">{userName(task.assigneeId)}</span>
												{task.dueDate ? (
													<Badge variant={overdue ? "destructive" : "outline"}>
														Due {formatDate(task.dueDate)}
													</Badge>
												) : null}
											</div>

											{!readOnly && canAssign ? (
												<Select
													value={task.assigneeId ?? UNASSIGNED}
													onValueChange={value => handleAssign(task, String(value))}
													disabled={mutating}
												>
													<SelectTrigger className="h-8 w-full text-xs">
														<SelectValue>
															{value =>
																value === UNASSIGNED || !value
																	? "Unassigned"
																	: userName(String(value))
															}
														</SelectValue>
													</SelectTrigger>
													<SelectContent>
														<SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
														{(users ?? []).map(user => (
															<SelectItem key={user.id} value={user.id}>
																{user.name ?? user.email}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : null}

											{!readOnly && canUpdate ? (
												<div className="flex flex-wrap gap-1">
													{TASK_STATUS_ORDER.filter(s => s !== task.status).map(s => (
														<Button
															key={s}
															type="button"
															size="sm"
															variant="outline"
															className="h-7 text-xs"
															onClick={() => handleMove(task, s)}
															disabled={mutating}
														>
															{TASK_STATUS_LABELS[s]}
														</Button>
													))}
												</div>
											) : null}
										</div>
									)
								})}
								{columns[status].length === 0 ? (
									<p className="text-muted-foreground py-2 text-center text-xs">Empty</p>
								) : null}
							</div>
						</div>
					))}
				</div>
			) : null}

			<TaskCreateDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				fixedProjectId={projectId}
				isGlobal={isGlobal}
			/>

			<AlertDialog open={Boolean(toDelete)} onOpenChange={open => !open && setToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete task</AlertDialogTitle>
						<AlertDialogDescription>
							{toDelete ? `Delete "${toDelete.title}"? This cannot be undone.` : ""}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteTask.isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={confirmDelete}
							disabled={deleteTask.isPending}
						>
							{deleteTask.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

interface TaskCreateDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	fixedProjectId?: number
	isGlobal: boolean
}

function TaskCreateDialog({ open, onOpenChange, fixedProjectId, isGlobal }: TaskCreateDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				{open ? (
					<TaskCreateForm
						onClose={() => onOpenChange(false)}
						fixedProjectId={fixedProjectId}
						isGlobal={isGlobal}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	)
}

function TaskCreateForm({
	onClose,
	fixedProjectId,
	isGlobal,
}: {
	onClose: () => void
	fixedProjectId?: number
	isGlobal: boolean
}) {
	const { data: users } = useUsersQuery()
	const { data: projects } = useProjectsQuery()
	const createTask = useCreateTaskMutation()

	// Closed projects are read-only/archived: never offer them as task targets.
	const openProjects = useMemo(
		() => (projects ?? []).filter(p => p.status !== "closed"),
		[projects]
	)
	const noOpenProjects = isGlobal && openProjects.length === 0

	const [title, setTitle] = useState("")
	const [projectId, setProjectId] = useState<string>(fixedProjectId ? String(fixedProjectId) : "")
	const [assigneeId, setAssigneeId] = useState<string>("")
	const [dueDate, setDueDate] = useState("")
	const [requirements, setRequirements] = useState("")
	const [formError, setFormError] = useState<string | null>(null)

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()
		setFormError(null)

		const trimmed = title.trim()
		if (!trimmed) {
			setFormError("Title is required")
			return
		}
		const effectiveProjectId = fixedProjectId ?? (projectId ? Number(projectId) : undefined)
		if (!effectiveProjectId) {
			setFormError("Select a project")
			return
		}

		try {
			await createTask.mutateAsync({
				projectId: effectiveProjectId,
				title: trimmed,
				assigneeId: assigneeId || null,
				dueDate: dueDate ? new Date(dueDate) : null,
				requirements: requirements.trim() || null,
			})
			toast.success("Task created")
			onClose()
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to create task"
			setFormError(message)
			toast.error(message)
		}
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>New task</DialogTitle>
				<DialogDescription>Add a task to the board.</DialogDescription>
			</DialogHeader>

			<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
				<Field data-invalid={Boolean(formError)}>
					<FieldLabel htmlFor="task-title">Title</FieldLabel>
					<Input
						id="task-title"
						value={title}
						onChange={e => setTitle(e.target.value)}
						placeholder="What needs doing?"
						disabled={createTask.isPending}
						aria-invalid={Boolean(formError)}
					/>
				</Field>

				{isGlobal ? (
					<Field>
						<FieldLabel>Project</FieldLabel>
						{noOpenProjects ? (
							<p className="text-muted-foreground text-sm">
								No active projects are available to receive new tasks. Create or activate a project
								first.
							</p>
						) : (
							<Select
								value={projectId || null}
								onValueChange={value => setProjectId(value ? String(value) : "")}
								disabled={createTask.isPending}
							>
								<SelectTrigger className="w-full">
									<SelectValue>
										{value =>
											value
												? (openProjects.find(p => String(p.id) === String(value))?.title ??
													`Project #${value}`)
												: "Select a project"
										}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{openProjects.map(project => (
										<SelectItem key={project.id} value={String(project.id)}>
											{project.title}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</Field>
				) : null}

				<Field>
					<FieldLabel>Assignee (optional)</FieldLabel>
					<Select
						value={assigneeId || null}
						onValueChange={value => setAssigneeId(value ? String(value) : "")}
						disabled={createTask.isPending}
					>
						<SelectTrigger className="w-full">
							<SelectValue>
								{value => {
									if (!value) return "Unassigned"
									const u = (users ?? []).find(item => item.id === String(value))
									return u ? (u.name ?? u.email) : String(value)
								}}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{(users ?? []).map(user => (
								<SelectItem key={user.id} value={user.id}>
									{user.name ?? user.email}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<Field>
					<FieldLabel htmlFor="task-due">Due date (optional)</FieldLabel>
					<Input
						id="task-due"
						type="date"
						value={dueDate}
						onChange={e => setDueDate(e.target.value)}
						disabled={createTask.isPending}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="task-requirements">Requirements (optional)</FieldLabel>
					<Textarea
						id="task-requirements"
						value={requirements}
						onChange={e => setRequirements(e.target.value)}
						placeholder="Acceptance criteria, notes"
						rows={2}
						disabled={createTask.isPending}
					/>
				</Field>

				{formError ? <FieldError>{formError}</FieldError> : null}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose} disabled={createTask.isPending}>
						Cancel
					</Button>
					<Button type="submit" disabled={createTask.isPending || noOpenProjects}>
						{createTask.isPending ? "Creating..." : "Create task"}
					</Button>
				</DialogFooter>
			</form>
		</>
	)
}
