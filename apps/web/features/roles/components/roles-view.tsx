"use client"

import { useState } from "react"
import {
	Add01Icon,
	Delete02Icon,
	PencilEdit02Icon,
	SecurityCheckIcon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import type { Role } from "@repo/contracts"

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
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { RoleEditor } from "@/features/roles/components/role-editor"
import { useDeleteRoleMutation, useRolesQuery } from "@/features/user-management/api/rbac.hooks"

type EditorState = { mode: "list" } | { mode: "create" } | { mode: "edit"; role: Role }

export function RolesView() {
	const { data: roles, isLoading, isError, error } = useRolesQuery()
	const deleteRole = useDeleteRoleMutation()

	const [editor, setEditor] = useState<EditorState>({ mode: "list" })
	const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)

	async function confirmDelete() {
		if (!roleToDelete) return
		try {
			await deleteRole.mutateAsync(roleToDelete.id)
			toast.success(`Deleted "${roleToDelete.name}"`)
			setRoleToDelete(null)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete role")
		}
	}

	if (editor.mode !== "list") {
		return (
			<section className="flex w-full flex-col gap-6">
				<RoleEditor
					role={editor.mode === "edit" ? editor.role : undefined}
					onClose={() => setEditor({ mode: "list" })}
				/>
			</section>
		)
	}

	return (
		<section className="flex w-full flex-col gap-6">
			<PageHeader
				icon={SecurityCheckIcon}
				title="Roles & Permissions"
				description="Compose roles from the permission matrix."
				actions={
					<Button onClick={() => setEditor({ mode: "create" })} size="sm">
						<HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
						Create role
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
					{error instanceof Error ? error.message : "Failed to load roles"}
				</p>
			) : null}

			{roles && roles.length > 0 ? (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Role</TableHead>
								<TableHead className="text-right">Permissions</TableHead>
								<TableHead className="text-right">Users</TableHead>
								<TableHead className="w-0 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{roles.map(role => {
								const isAdmin = role.name === "Admin"
								return (
									<TableRow key={role.id}>
										<TableCell className="align-top">
											<div className="font-medium">{role.name}</div>
											{role.description ? (
												<div className="text-muted-foreground text-xs">{role.description}</div>
											) : null}
										</TableCell>
										<TableCell className="text-right align-top">
											{isAdmin ? (
												<Badge variant="secondary">All</Badge>
											) : (
												<span className="tabular-nums">{role.permissions.length}</span>
											)}
										</TableCell>
										<TableCell className="text-right align-top tabular-nums">
											{role.userCount}
										</TableCell>
										<TableCell className="align-top">
											<div className="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => setEditor({ mode: "edit", role })}
													aria-label={`Edit ${role.name}`}
												>
													<HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => setRoleToDelete(role)}
													disabled={isAdmin}
													aria-label={`Delete ${role.name}`}
												>
													<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				</div>
			) : null}

			{roles && roles.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<HugeiconsIcon icon={UserMultipleIcon} strokeWidth={2} />
						</EmptyMedia>
						<EmptyTitle>No roles yet</EmptyTitle>
						<EmptyDescription>Create your first role to start granting access.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}

			<AlertDialog
				open={Boolean(roleToDelete)}
				onOpenChange={open => !open && setRoleToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete role</AlertDialogTitle>
						<AlertDialogDescription>
							{roleToDelete
								? `Delete "${roleToDelete.name}"? This removes it from all assigned users.`
								: ""}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={confirmDelete}
							disabled={deleteRole.isPending}
						>
							{deleteRole.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	)
}
