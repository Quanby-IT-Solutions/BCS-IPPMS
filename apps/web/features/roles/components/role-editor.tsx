"use client"

import { useState } from "react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import type { PermissionName, Role } from "@repo/contracts"

import { Button } from "@/core/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { PermissionMatrix } from "@/features/roles/components/permission-matrix"
import { useRateLimitToast } from "@/core/hooks/use-rate-limit-toast"
import {
	useCreateRoleMutation,
	useRolesQuery,
	useSetRolePermissionsMutation,
	useUpdateRoleMutation,
} from "@/features/user-management/api/rbac.hooks"

interface RoleEditorProps {
	role?: Role
	onClose: () => void
}

export function RoleEditor({ role, onClose }: RoleEditorProps) {
	const isEdit = Boolean(role)
	const isAdminRole = role?.name === "Admin"

	const { data: roles } = useRolesQuery()

	const [name, setName] = useState(role?.name ?? "")
	const [description, setDescription] = useState(role?.description ?? "")
	const [permissions, setPermissions] = useState<PermissionName[]>(role?.permissions ?? [])
	const [formError, setFormError] = useState<string | null>(null)

	const createRole = useCreateRoleMutation()
	const updateRole = useUpdateRoleMutation()
	const setRolePermissions = useSetRolePermissionsMutation()

	const isPending = createRole.isPending || updateRole.isPending || setRolePermissions.isPending

	// Live 429 countdown for whichever write in the submit chain hit the limit.
	const { isActive, secondsLeft } = useRateLimitToast(
		createRole.error ?? updateRole.error ?? setRolePermissions.error,
		{ toastId: "rbac-role-form" }
	)

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()
		setFormError(null)

		const trimmed = name.trim()
		if (!trimmed) {
			setFormError("Name is required")
			return
		}

		const duplicate = (roles ?? []).some(
			r => r.id !== role?.id && r.name.toLowerCase() === trimmed.toLowerCase()
		)
		if (duplicate) {
			setFormError("A role with this name already exists")
			return
		}

		try {
			if (isEdit && role) {
				await updateRole.mutateAsync({
					id: role.id,
					name: trimmed,
					description: description.trim() || null,
				})
				await setRolePermissions.mutateAsync({ id: role.id, permissions })
				toast.success("Role updated")
			} else {
				const created = await createRole.mutateAsync({
					name: trimmed,
					description: description.trim() || undefined,
				})
				if (permissions.length) {
					await setRolePermissions.mutateAsync({ id: created.id, permissions })
				}
				toast.success("Role created")
			}
			onClose()
		} catch (err) {
			const message = err instanceof Error ? err.message : "Something went wrong"
			setFormError(message)
			toast.error(message)
		}
	}

	return (
		<form className="flex flex-col gap-6" onSubmit={handleSubmit}>
			<div className="flex items-center gap-2">
				<Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Back">
					<HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
				</Button>
				<div>
					<h2 className="text-lg font-semibold">{isEdit ? `Edit ${role?.name}` : "New role"}</h2>
					<p className="text-muted-foreground text-sm">
						Set the role details and choose the permissions it grants.
					</p>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<Field data-invalid={Boolean(formError)}>
					<FieldLabel htmlFor="role-name">Name</FieldLabel>
					<Input
						id="role-name"
						value={name}
						onChange={e => setName(e.target.value)}
						placeholder="e.g. Editor"
						disabled={isPending || isAdminRole}
						aria-invalid={Boolean(formError)}
					/>
					{isAdminRole ? (
						<p className="text-muted-foreground text-xs">The Admin role cannot be renamed.</p>
					) : null}
				</Field>

				<Field>
					<FieldLabel htmlFor="role-description">Description</FieldLabel>
					<Input
						id="role-description"
						value={description}
						onChange={e => setDescription(e.target.value)}
						placeholder="What is this role for?"
						disabled={isPending}
					/>
				</Field>
			</div>

			<Field>
				<FieldLabel>Permissions</FieldLabel>
				<PermissionMatrix value={permissions} onChange={setPermissions} disabled={isPending} />
			</Field>

			{formError ? <FieldError>{formError}</FieldError> : null}

			<div className="flex items-center justify-end gap-2">
				<Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
					Cancel
				</Button>
				<Button type="submit" disabled={isPending || isActive}>
					{isActive
						? `Try again in ${secondsLeft}s`
						: isPending
							? "Saving..."
							: isEdit
								? "Save changes"
								: "Create role"}
				</Button>
			</div>
		</form>
	)
}
