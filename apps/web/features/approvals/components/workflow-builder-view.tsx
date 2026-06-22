"use client"

import { useState } from "react"
import {
	Add01Icon,
	ArrowDown01Icon,
	ArrowUp01Icon,
	Delete02Icon,
	PencilEdit02Icon,
	WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import type { ApprovalModule, ApprovalWorkflowSummary } from "@repo/contracts"

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Switch } from "@/core/components/ui/switch"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import {
	useCreateWorkflowMutation,
	useDeleteWorkflowMutation,
	useUpdateWorkflowMutation,
	useWorkflowQuery,
	useWorkflowsQuery,
} from "@/features/approvals/api/approvals.hooks"
import { useDivisionsQuery } from "@/features/divisions/api/divisions.hooks"
import { useRolesQuery } from "@/features/user-management/api/rbac.hooks"

const MODULE_LABELS: Record<ApprovalModule, string> = {
	projects: "Projects",
	job_orders: "Job Orders",
}

const MODULE_OPTIONS: ApprovalModule[] = ["projects", "job_orders"]

const ALL_VALUE = "__all__"

export function WorkflowBuilderView() {
	const [moduleFilter, setModuleFilter] = useState<ApprovalModule | undefined>(undefined)
	const [divisionFilter, setDivisionFilter] = useState<number | undefined>(undefined)

	const {
		data: workflows,
		isLoading,
		isError,
		error,
		refetch,
	} = useWorkflowsQuery({
		module: moduleFilter,
		divisionId: divisionFilter,
	})
	const { data: divisions } = useDivisionsQuery()
	const deleteWorkflow = useDeleteWorkflowMutation()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingId, setEditingId] = useState<number | null>(null)
	const [toDelete, setToDelete] = useState<ApprovalWorkflowSummary | null>(null)

	function openCreate() {
		setEditingId(null)
		setDialogOpen(true)
	}

	function openEdit(workflow: ApprovalWorkflowSummary) {
		setEditingId(workflow.id)
		setDialogOpen(true)
	}

	async function confirmDelete() {
		if (!toDelete) return
		try {
			await deleteWorkflow.mutateAsync(toDelete.id)
			toast.success("Workflow deleted")
			setToDelete(null)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete workflow")
		}
	}

	return (
		<section className="flex w-full flex-col gap-6">
			<PageHeader
				icon={WorkflowSquare01Icon}
				title="Workflow Builder"
				description="Configure ordered, role-based approval chains per module and division."
				actions={
					<Button onClick={openCreate} size="sm">
						<HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
						Create workflow
					</Button>
				}
			/>

			<div className="flex flex-wrap items-center gap-3">
				<Select
					value={moduleFilter ?? ALL_VALUE}
					onValueChange={value =>
						setModuleFilter(value === ALL_VALUE ? undefined : (value as ApprovalModule))
					}
				>
					<SelectTrigger className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_VALUE}>All modules</SelectItem>
						{MODULE_OPTIONS.map(mod => (
							<SelectItem key={mod} value={mod}>
								{MODULE_LABELS[mod]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={divisionFilter ? String(divisionFilter) : ALL_VALUE}
					onValueChange={value =>
						setDivisionFilter(value === ALL_VALUE ? undefined : Number(value))
					}
				>
					<SelectTrigger className="w-56">
						<SelectValue>
							{value =>
								value === ALL_VALUE
									? "All divisions"
									: ((divisions ?? []).find(d => String(d.id) === value)?.name ?? "All divisions")
							}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_VALUE}>All divisions</SelectItem>
						{(divisions ?? []).map(division => (
							<SelectItem key={division.id} value={String(division.id)}>
								{division.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : null}

			{isError ? (
				<div className="flex flex-col items-start gap-2">
					<p className="text-destructive text-sm">
						{error instanceof Error ? error.message : "Failed to load workflows"}
					</p>
					<Button size="sm" variant="outline" onClick={() => refetch()}>
						Retry
					</Button>
				</div>
			) : null}

			{workflows && workflows.length > 0 ? (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Module</TableHead>
								<TableHead>Division</TableHead>
								<TableHead>Levels</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-0 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{workflows.map(workflow => (
								<TableRow key={workflow.id}>
									<TableCell className="font-medium">{MODULE_LABELS[workflow.module]}</TableCell>
									<TableCell>{workflow.divisionName ?? `#${workflow.divisionId}`}</TableCell>
									<TableCell>{workflow.stepCount}</TableCell>
									<TableCell>
										<Badge variant={workflow.isActive ? "default" : "secondary"}>
											{workflow.isActive ? "Active" : "Inactive"}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex items-center justify-end gap-1">
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => openEdit(workflow)}
												aria-label="Edit workflow"
											>
												<HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => setToDelete(workflow)}
												aria-label="Delete workflow"
											>
												<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : null}

			{workflows && workflows.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<HugeiconsIcon icon={WorkflowSquare01Icon} strokeWidth={2} />
						</EmptyMedia>
						<EmptyTitle>No workflows configured</EmptyTitle>
						<EmptyDescription>
							Create an approval chain to route a module&apos;s requests through role-based levels.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}

			<WorkflowEditorDialog open={dialogOpen} onOpenChange={setDialogOpen} workflowId={editingId} />

			<AlertDialog open={Boolean(toDelete)} onOpenChange={open => !open && setToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete workflow</AlertDialogTitle>
						<AlertDialogDescription>
							{toDelete
								? `Delete the ${MODULE_LABELS[toDelete.module]} workflow for ${
										toDelete.divisionName ?? `division #${toDelete.divisionId}`
									}? This cannot be undone.`
								: ""}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={confirmDelete}
							disabled={deleteWorkflow.isPending}
						>
							{deleteWorkflow.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	)
}

interface WorkflowEditorDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	workflowId: number | null
}

function WorkflowEditorDialog({ open, onOpenChange, workflowId }: WorkflowEditorDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl">
				{open ? (
					<WorkflowEditor
						key={workflowId ?? "new"}
						workflowId={workflowId}
						onClose={() => onOpenChange(false)}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	)
}

interface LevelDraft {
	key: string
	approverRoleId: number | null
}

let levelKeySeq = 0
function nextLevelKey() {
	levelKeySeq += 1
	return `level-${levelKeySeq}`
}

function WorkflowEditor({
	workflowId,
	onClose,
}: {
	workflowId: number | null
	onClose: () => void
}) {
	const isEdit = workflowId !== null
	const { data: detail, isLoading: detailLoading } = useWorkflowQuery(workflowId, isEdit)

	if (!isEdit) {
		return (
			<EditorForm
				workflowId={null}
				initialModule=""
				initialDivisionId={null}
				initialIsActive={true}
				initialLevels={[{ key: nextLevelKey(), approverRoleId: null }]}
				onClose={onClose}
			/>
		)
	}

	if (detailLoading || !detail) {
		return (
			<>
				<DialogHeader>
					<DialogTitle>Edit workflow</DialogTitle>
					<DialogDescription>Loading workflow…</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2 py-2">
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-9 w-full" />
				</div>
			</>
		)
	}

	return (
		<EditorForm
			workflowId={detail.id}
			initialModule={detail.module}
			initialDivisionId={detail.divisionId}
			initialIsActive={detail.isActive}
			initialLevels={
				detail.steps.length > 0
					? detail.steps
							.slice()
							.sort((a, b) => a.stepOrder - b.stepOrder)
							.map(step => ({ key: nextLevelKey(), approverRoleId: step.approverRoleId }))
					: [{ key: nextLevelKey(), approverRoleId: null }]
			}
			onClose={onClose}
		/>
	)
}

interface EditorFormProps {
	workflowId: number | null
	initialModule: ApprovalModule | ""
	initialDivisionId: number | null
	initialIsActive: boolean
	initialLevels: LevelDraft[]
	onClose: () => void
}

function EditorForm({
	workflowId,
	initialModule,
	initialDivisionId,
	initialIsActive,
	initialLevels,
	onClose,
}: EditorFormProps) {
	const isEdit = workflowId !== null
	const { data: divisions } = useDivisionsQuery()
	const { data: roles } = useRolesQuery()

	const createWorkflow = useCreateWorkflowMutation()
	const updateWorkflow = useUpdateWorkflowMutation()
	const isPending = createWorkflow.isPending || updateWorkflow.isPending

	const [module, setModule] = useState<ApprovalModule | "">(initialModule)
	const [divisionId, setDivisionId] = useState<number | null>(initialDivisionId)
	const [isActive, setIsActive] = useState(initialIsActive)
	const [levels, setLevels] = useState<LevelDraft[]>(initialLevels)
	const [formError, setFormError] = useState<string | null>(null)

	const activeDivisions = (divisions ?? []).filter(d => d.isActive || d.id === divisionId)

	function setLevelRole(key: string, roleId: number) {
		setLevels(prev => prev.map(l => (l.key === key ? { ...l, approverRoleId: roleId } : l)))
	}

	function addLevel() {
		setLevels(prev => [...prev, { key: nextLevelKey(), approverRoleId: null }])
	}

	function removeLevel(key: string) {
		setLevels(prev => (prev.length <= 1 ? prev : prev.filter(l => l.key !== key)))
	}

	function moveLevel(index: number, direction: -1 | 1) {
		setLevels(prev => {
			const target = index + direction
			if (target < 0 || target >= prev.length) return prev
			const next = prev.slice()
			const item = next[index]
			if (!item) return prev
			next.splice(index, 1)
			next.splice(target, 0, item)
			return next
		})
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()
		setFormError(null)

		if (!isEdit && !module) {
			setFormError("Select a module")
			return
		}
		if (!isEdit && divisionId === null) {
			setFormError("Select a division")
			return
		}
		if (levels.length < 1) {
			setFormError("At least one level is required")
			return
		}
		if (levels.some(l => l.approverRoleId === null)) {
			setFormError("Every level must have a role selected")
			return
		}

		const steps = levels.map(l => ({ approverRoleId: l.approverRoleId as number }))

		try {
			if (isEdit && workflowId !== null) {
				await updateWorkflow.mutateAsync({ id: workflowId, isActive, steps })
				toast.success("Workflow updated")
			} else {
				await createWorkflow.mutateAsync({
					module: module as ApprovalModule,
					divisionId: divisionId as number,
					isActive,
					steps,
				})
				toast.success("Workflow created")
			}
			onClose()
		} catch (err) {
			const message = err instanceof Error ? err.message : "Something went wrong"
			setFormError(message)
			toast.error(message)
		}
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>{isEdit ? "Edit workflow" : "Create workflow"}</DialogTitle>
				<DialogDescription>
					Pick a module and division, then order the role-based approval levels.
				</DialogDescription>
			</DialogHeader>

			<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
				<Field>
					<FieldLabel>Module</FieldLabel>
					<Select
						value={module || null}
						onValueChange={value => setModule(value as ApprovalModule)}
						disabled={isEdit || isPending}
					>
						<SelectTrigger className="w-full">
							<SelectValue>
								{value => (value ? MODULE_LABELS[value as ApprovalModule] : "Select a module")}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{MODULE_OPTIONS.map(mod => (
								<SelectItem key={mod} value={mod}>
									{MODULE_LABELS[mod]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<Field>
					<FieldLabel>Division</FieldLabel>
					<Select
						value={divisionId ? String(divisionId) : null}
						onValueChange={value => setDivisionId(Number(value))}
						disabled={isEdit || isPending}
					>
						<SelectTrigger className="w-full">
							<SelectValue>
								{value =>
									value
										? (activeDivisions.find(d => String(d.id) === value)?.name ??
											"Select a division")
										: "Select a division"
								}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{activeDivisions.map(division => (
								<SelectItem key={division.id} value={String(division.id)}>
									{division.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<Field>
					<div className="flex items-center justify-between">
						<FieldLabel>Approval levels</FieldLabel>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={addLevel}
							disabled={isPending}
						>
							<HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
							Add level
						</Button>
					</div>
					<div className="flex flex-col gap-2">
						{levels.map((level, index) => (
							<div key={level.key} className="flex items-center gap-2">
								<span className="text-muted-foreground w-16 shrink-0 text-sm">
									Level {index + 1}
								</span>
								<Select
									value={level.approverRoleId ? String(level.approverRoleId) : null}
									onValueChange={value => setLevelRole(level.key, Number(value))}
									disabled={isPending}
								>
									<SelectTrigger className="w-full flex-1">
										<SelectValue>
											{value =>
												value
													? ((roles ?? []).find(r => String(r.id) === value)?.name ??
														"Select a role")
													: "Select a role"
											}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{(roles ?? []).map(role => (
											<SelectItem key={role.id} value={String(role.id)}>
												{role.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => moveLevel(index, -1)}
									disabled={index === 0 || isPending}
									aria-label="Move level up"
								>
									<HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => moveLevel(index, 1)}
									disabled={index === levels.length - 1 || isPending}
									aria-label="Move level down"
								>
									<HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => removeLevel(level.key)}
									disabled={levels.length <= 1 || isPending}
									aria-label="Remove level"
								>
									<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
								</Button>
							</div>
						))}
					</div>
				</Field>

				<div className="flex items-center gap-3">
					<Switch
						id="workflow-active"
						checked={isActive}
						onCheckedChange={setIsActive}
						disabled={isPending}
					/>
					<FieldLabel htmlFor="workflow-active">Active</FieldLabel>
				</div>

				{formError ? <FieldError>{formError}</FieldError> : null}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
						Cancel
					</Button>
					<Button type="submit" disabled={isPending}>
						{isPending ? "Saving..." : isEdit ? "Save changes" : "Create workflow"}
					</Button>
				</DialogFooter>
			</form>
		</>
	)
}
