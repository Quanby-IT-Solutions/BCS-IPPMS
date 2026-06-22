"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { useDivisionsQuery } from "@/features/divisions/api/divisions.hooks"
import { useCreateProjectMutation } from "@/features/projects/api/projects.hooks"

interface ProjectCreateDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function ProjectCreateDialog({ open, onOpenChange }: ProjectCreateDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				{open ? <ProjectCreateForm onClose={() => onOpenChange(false)} /> : null}
			</DialogContent>
		</Dialog>
	)
}

function ProjectCreateForm({ onClose }: { onClose: () => void }) {
	const router = useRouter()
	const { data: divisions } = useDivisionsQuery()
	const createProject = useCreateProjectMutation()

	const [title, setTitle] = useState("")
	const [objectives, setObjectives] = useState("")
	const [scope, setScope] = useState("")
	const [deliverables, setDeliverables] = useState("")
	const [divisionId, setDivisionId] = useState<string>("")
	const [formError, setFormError] = useState<string | null>(null)

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()
		setFormError(null)

		const trimmed = title.trim()
		if (!trimmed) {
			setFormError("Title is required")
			return
		}

		try {
			const project = await createProject.mutateAsync({
				title: trimmed,
				objectives: objectives.trim() || null,
				scope: scope.trim() || null,
				deliverables: deliverables.trim() || null,
				divisionId: divisionId ? Number(divisionId) : undefined,
			})
			toast.success("Proposal created as draft")
			onClose()
			router.push(`/projects/${project.id}`)
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to create project"
			setFormError(message)
			toast.error(message)
		}
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>New project proposal</DialogTitle>
				<DialogDescription>
					Capture the concept. The project starts as a draft you can submit for approval later.
				</DialogDescription>
			</DialogHeader>

			<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
				<Field data-invalid={Boolean(formError)}>
					<FieldLabel htmlFor="project-title">Title</FieldLabel>
					<Input
						id="project-title"
						value={title}
						onChange={e => setTitle(e.target.value)}
						placeholder="e.g. Annual Report Production"
						disabled={createProject.isPending}
						aria-invalid={Boolean(formError)}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="project-objectives">Objectives</FieldLabel>
					<Textarea
						id="project-objectives"
						value={objectives}
						onChange={e => setObjectives(e.target.value)}
						placeholder="What this project aims to achieve"
						rows={2}
						disabled={createProject.isPending}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="project-scope">Scope</FieldLabel>
					<Textarea
						id="project-scope"
						value={scope}
						onChange={e => setScope(e.target.value)}
						placeholder="What is in and out of scope"
						rows={2}
						disabled={createProject.isPending}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="project-deliverables">Deliverables</FieldLabel>
					<Textarea
						id="project-deliverables"
						value={deliverables}
						onChange={e => setDeliverables(e.target.value)}
						placeholder="Expected outputs"
						rows={2}
						disabled={createProject.isPending}
					/>
				</Field>

				<Field>
					<FieldLabel>Division (optional)</FieldLabel>
					<Select
						value={divisionId || null}
						onValueChange={value => setDivisionId(value ? String(value) : "")}
						disabled={createProject.isPending}
					>
						<SelectTrigger className="w-full">
							<SelectValue>
								{value =>
									value
										? ((divisions ?? []).find(d => String(d.id) === String(value))?.name ??
											`Division #${value}`)
										: "Default to my division"
								}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{(divisions ?? []).map(division => (
								<SelectItem key={division.id} value={String(division.id)}>
									{division.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				{formError ? <FieldError>{formError}</FieldError> : null}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={createProject.isPending}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={createProject.isPending}>
						{createProject.isPending ? "Creating..." : "Create draft"}
					</Button>
				</DialogFooter>
			</form>
		</>
	)
}
