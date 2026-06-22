"use client"

import { useState } from "react"
import { Add01Icon, Building01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import type { Division } from "@repo/contracts"

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
import { Input } from "@/core/components/ui/input"
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
import { Textarea } from "@/core/components/ui/textarea"
import {
	useCreateDivisionMutation,
	useDivisionsQuery,
	useSetDivisionActiveMutation,
	useUpdateDivisionMutation,
} from "@/features/divisions/api/divisions.hooks"

export function DivisionsView() {
	const { data: divisions, isLoading, isError, error } = useDivisionsQuery()
	const setActive = useSetDivisionActiveMutation()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editing, setEditing] = useState<Division | undefined>(undefined)
	const [toDeactivate, setToDeactivate] = useState<Division | null>(null)

	function openCreate() {
		setEditing(undefined)
		setDialogOpen(true)
	}

	function openEdit(division: Division) {
		setEditing(division)
		setDialogOpen(true)
	}

	async function toggleActive(division: Division) {
		if (division.isActive) {
			setToDeactivate(division)
			return
		}
		try {
			await setActive.mutateAsync({ id: division.id, isActive: true })
			toast.success(`Activated "${division.name}"`)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to activate division")
		}
	}

	async function confirmDeactivate() {
		if (!toDeactivate) return
		try {
			await setActive.mutateAsync({ id: toDeactivate.id, isActive: false })
			toast.success(`Deactivated "${toDeactivate.name}"`)
			setToDeactivate(null)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to deactivate division")
		}
	}

	return (
		<section className="flex w-full flex-col gap-6">
			<PageHeader
				icon={Building01Icon}
				title="Divisions"
				description="Create divisions and control which are active."
				actions={
					<Button onClick={openCreate} size="sm">
						<HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
						Add division
					</Button>
				}
			/>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : null}

			{isError ? (
				<p className="text-destructive text-sm">
					{error instanceof Error ? error.message : "Failed to load divisions"}
				</p>
			) : null}

			{divisions && divisions.length > 0 ? (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Description</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-0 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{divisions.map(division => (
								<TableRow key={division.id}>
									<TableCell className="align-top font-medium">{division.name}</TableCell>
									<TableCell className="text-muted-foreground align-top text-sm">
										{division.description ?? "—"}
									</TableCell>
									<TableCell className="align-top">
										<Badge variant={division.isActive ? "default" : "secondary"}>
											{division.isActive ? "Active" : "Inactive"}
										</Badge>
									</TableCell>
									<TableCell className="align-top">
										<div className="flex items-center justify-end gap-3">
											<Switch
												checked={division.isActive}
												onCheckedChange={() => toggleActive(division)}
												disabled={setActive.isPending}
												aria-label={`Toggle ${division.name}`}
											/>
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => openEdit(division)}
												aria-label={`Edit ${division.name}`}
											>
												<HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : null}

			{divisions && divisions.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<HugeiconsIcon icon={Building01Icon} strokeWidth={2} />
						</EmptyMedia>
						<EmptyTitle>No divisions yet</EmptyTitle>
						<EmptyDescription>Add your first division to scope users and work.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}

			<DivisionFormDialog open={dialogOpen} onOpenChange={setDialogOpen} division={editing} />

			<AlertDialog
				open={Boolean(toDeactivate)}
				onOpenChange={open => !open && setToDeactivate(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate division</AlertDialogTitle>
						<AlertDialogDescription>
							{toDeactivate
								? `Deactivate "${toDeactivate.name}"? Users scoped to it lose division-scoped access until reactivated.`
								: ""}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={confirmDeactivate}
							disabled={setActive.isPending}
						>
							{setActive.isPending ? "Deactivating..." : "Deactivate"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	)
}

interface DivisionFormDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	division?: Division
}

function DivisionFormDialog({ open, onOpenChange, division }: DivisionFormDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				{open ? (
					<DivisionForm
						key={division?.id ?? "new"}
						division={division}
						onClose={() => onOpenChange(false)}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	)
}

function DivisionForm({ division, onClose }: { division?: Division; onClose: () => void }) {
	const isEdit = Boolean(division)
	const [name, setName] = useState(division?.name ?? "")
	const [description, setDescription] = useState(division?.description ?? "")
	const [formError, setFormError] = useState<string | null>(null)

	const createDivision = useCreateDivisionMutation()
	const updateDivision = useUpdateDivisionMutation()
	const isPending = createDivision.isPending || updateDivision.isPending

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()
		setFormError(null)

		const trimmed = name.trim()
		if (!trimmed) {
			setFormError("Name is required")
			return
		}

		try {
			if (isEdit && division) {
				await updateDivision.mutateAsync({
					id: division.id,
					name: trimmed,
					description: description.trim() || null,
				})
				toast.success("Division updated")
			} else {
				await createDivision.mutateAsync({
					name: trimmed,
					description: description.trim() || undefined,
				})
				toast.success("Division created")
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
				<DialogTitle>{isEdit ? "Edit division" : "Add division"}</DialogTitle>
				<DialogDescription>
					{isEdit ? "Update the division details." : "Create a new division."}
				</DialogDescription>
			</DialogHeader>

			<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
				<Field data-invalid={Boolean(formError)}>
					<FieldLabel htmlFor="division-name">Name</FieldLabel>
					<Input
						id="division-name"
						value={name}
						onChange={e => setName(e.target.value)}
						placeholder="e.g. Engineering"
						disabled={isPending}
						aria-invalid={Boolean(formError)}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="division-description">Description</FieldLabel>
					<Textarea
						id="division-description"
						value={description}
						onChange={e => setDescription(e.target.value)}
						placeholder="What does this division cover?"
						disabled={isPending}
						rows={2}
					/>
				</Field>

				{formError ? <FieldError>{formError}</FieldError> : null}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
						Cancel
					</Button>
					<Button type="submit" disabled={isPending}>
						{isPending ? "Saving..." : isEdit ? "Save changes" : "Create division"}
					</Button>
				</DialogFooter>
			</form>
		</>
	)
}
