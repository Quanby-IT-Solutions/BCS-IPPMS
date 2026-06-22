"use client"

import { useState } from "react"
import { toast } from "sonner"

import type { Project } from "@repo/contracts"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { Textarea } from "@/core/components/ui/textarea"
import { canAccess, type AccessProfile } from "@/features/dashboard/lib/access"
import { useUpdateProjectMutation } from "@/features/projects/api/projects.hooks"

interface ProjectConceptualizationTabProps {
	project: Project
	access: AccessProfile
}

export function ProjectConceptualizationTab({ project, access }: ProjectConceptualizationTabProps) {
	const updateProject = useUpdateProjectMutation()

	const [title, setTitle] = useState(project.title)
	const [objectives, setObjectives] = useState(project.objectives ?? "")
	const [scope, setScope] = useState(project.scope ?? "")
	const [deliverables, setDeliverables] = useState(project.deliverables ?? "")
	const [formError, setFormError] = useState<string | null>(null)

	const readOnly =
		project.status === "closed" || !canAccess(access, { requiredPermission: "projects:update" })

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()
		setFormError(null)

		const trimmed = title.trim()
		if (!trimmed) {
			setFormError("Title is required")
			return
		}

		try {
			await updateProject.mutateAsync({
				id: project.id,
				title: trimmed,
				objectives: objectives.trim() || null,
				scope: scope.trim() || null,
				deliverables: deliverables.trim() || null,
			})
			toast.success("Conceptualization saved")
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to save"
			setFormError(message)
			toast.error(message)
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Conceptualization</CardTitle>
			</CardHeader>
			<CardContent>
				{project.status === "closed" ? (
					<p className="text-muted-foreground mb-4 text-sm">
						This project is closed and read-only.
					</p>
				) : null}
				<form className="flex max-w-2xl flex-col gap-4" onSubmit={handleSubmit}>
					<Field data-invalid={Boolean(formError)}>
						<FieldLabel htmlFor="concept-title">Title</FieldLabel>
						<Input
							id="concept-title"
							value={title}
							onChange={e => setTitle(e.target.value)}
							disabled={readOnly || updateProject.isPending}
							aria-invalid={Boolean(formError)}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="concept-objectives">Objectives</FieldLabel>
						<Textarea
							id="concept-objectives"
							value={objectives}
							onChange={e => setObjectives(e.target.value)}
							rows={3}
							disabled={readOnly || updateProject.isPending}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="concept-scope">Scope</FieldLabel>
						<Textarea
							id="concept-scope"
							value={scope}
							onChange={e => setScope(e.target.value)}
							rows={3}
							disabled={readOnly || updateProject.isPending}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="concept-deliverables">Deliverables</FieldLabel>
						<Textarea
							id="concept-deliverables"
							value={deliverables}
							onChange={e => setDeliverables(e.target.value)}
							rows={3}
							disabled={readOnly || updateProject.isPending}
						/>
					</Field>

					{formError ? <FieldError>{formError}</FieldError> : null}

					{!readOnly ? (
						<div className="flex justify-end">
							<Button type="submit" disabled={updateProject.isPending}>
								{updateProject.isPending ? "Saving..." : "Save changes"}
							</Button>
						</div>
					) : null}
				</form>
			</CardContent>
		</Card>
	)
}
