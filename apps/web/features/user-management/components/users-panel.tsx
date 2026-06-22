"use client"

import { useMemo, useState } from "react"
import {
	Add01Icon,
	Cancel01Icon,
	PencilEdit02Icon,
	UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import type { UserWithRoles } from "@repo/contracts"

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
import { Checkbox } from "@/core/components/ui/checkbox"
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
import { Switch } from "@/core/components/ui/switch"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useDivisionsQuery } from "@/features/divisions/api/divisions.hooks"
import {
	useAssignRoleMutation,
	useAssignUserDivisionMutation,
	useCreateUserMutation,
	useRemoveRoleMutation,
	useRolesQuery,
	useSetUserActiveMutation,
	useUpdateUserMutation,
	useUsersQuery,
} from "@/features/user-management/api/rbac.hooks"

const NO_DIVISION = "__none__"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function UsersPanel() {
	const { data: users, isLoading, isError, error } = useUsersQuery()
	const { data: roles } = useRolesQuery()
	const { data: divisions } = useDivisionsQuery()
	const assignRole = useAssignRoleMutation()
	const removeRole = useRemoveRoleMutation()
	const setActive = useSetUserActiveMutation()
	const assignDivision = useAssignUserDivisionMutation()

	const allRoleNames = useMemo(() => (roles ?? []).map(role => role.name), [roles])

	const [createOpen, setCreateOpen] = useState(false)
	const [editUser, setEditUser] = useState<UserWithRoles | null>(null)
	const [toDeactivate, setToDeactivate] = useState<UserWithRoles | null>(null)

	async function toggleActive(user: UserWithRoles) {
		if (user.isActive) {
			setToDeactivate(user)
			return
		}
		try {
			await setActive.mutateAsync({ userId: user.id, isActive: true })
			toast.success(`Activated ${user.email}`)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update user")
		}
	}

	async function confirmDeactivate() {
		if (!toDeactivate) return
		try {
			await setActive.mutateAsync({ userId: toDeactivate.id, isActive: false })
			toast.success(`Deactivated ${toDeactivate.email}`)
			setToDeactivate(null)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to deactivate user")
		}
	}

	async function changeDivision(user: UserWithRoles, value: string) {
		const divisionId = value === NO_DIVISION ? null : Number(value)
		try {
			await assignDivision.mutateAsync({ userId: user.id, divisionId })
			toast.success("Division updated")
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to assign division")
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Users</h2>
					<p className="text-muted-foreground text-sm">
						Create users, assign roles and divisions, and toggle access.
					</p>
				</div>
				<Button size="sm" onClick={() => setCreateOpen(true)}>
					<HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
					Create user
				</Button>
			</div>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : null}

			{isError ? (
				<p className="text-destructive text-sm">
					{error instanceof Error ? error.message : "Failed to load users"}
				</p>
			) : null}

			{users && users.length > 0 ? (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Roles</TableHead>
								<TableHead className="w-44">Division</TableHead>
								<TableHead className="w-44">Assign role</TableHead>
								<TableHead className="w-0 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users.map(user => {
								const assigned = new Set(user.roles)
								const available = allRoleNames.filter(name => !assigned.has(name))
								return (
									<TableRow key={user.id}>
										<TableCell className="align-top">
											<div className="font-medium">{user.name ?? "—"}</div>
											<div className="text-muted-foreground text-xs">{user.email}</div>
										</TableCell>
										<TableCell className="align-top">
											<div className="flex items-center gap-2">
												<Switch
													checked={user.isActive}
													onCheckedChange={() => toggleActive(user)}
													disabled={setActive.isPending}
													aria-label={`Toggle ${user.email}`}
												/>
												<Badge variant={user.isActive ? "default" : "secondary"}>
													{user.isActive ? "Active" : "Inactive"}
												</Badge>
											</div>
										</TableCell>
										<TableCell className="align-top">
											{user.roles.length ? (
												<div className="flex flex-wrap gap-1">
													{user.roles.map(roleName => (
														<Badge key={roleName} variant="outline" className="gap-1 pr-1">
															{roleName}
															<button
																type="button"
																onClick={() => removeRole.mutate({ userId: user.id, roleName })}
																disabled={removeRole.isPending}
																className="hover:text-destructive inline-flex items-center"
																aria-label={`Remove ${roleName} from ${user.email}`}
															>
																<HugeiconsIcon
																	icon={Cancel01Icon}
																	strokeWidth={2}
																	className="size-3"
																/>
															</button>
														</Badge>
													))}
												</div>
											) : (
												<span className="text-muted-foreground text-xs">No roles</span>
											)}
										</TableCell>
										<TableCell className="align-top">
											<Select
												value={user.divisionId ? String(user.divisionId) : NO_DIVISION}
												onValueChange={value => {
													if (typeof value === "string") changeDivision(user, value)
												}}
												disabled={assignDivision.isPending}
											>
												<SelectTrigger size="sm" className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value={NO_DIVISION}>No division</SelectItem>
													{(divisions ?? []).map(division => (
														<SelectItem key={division.id} value={String(division.id)}>
															{division.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell className="align-top">
											<Select
												value={null}
												onValueChange={value => {
													if (typeof value === "string") {
														assignRole.mutate({ userId: user.id, roleName: value })
													}
												}}
												disabled={available.length === 0 || assignRole.isPending}
											>
												<SelectTrigger size="sm" className="w-full">
													<SelectValue>Add role</SelectValue>
												</SelectTrigger>
												<SelectContent>
													{available.map(name => (
														<SelectItem key={name} value={name}>
															{name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell className="align-top">
											<div className="flex justify-end">
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => setEditUser(user)}
													aria-label={`Edit ${user.email}`}
												>
													<HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
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

			{users && users.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
						</EmptyMedia>
						<EmptyTitle>No users found</EmptyTitle>
						<EmptyDescription>Create a user to get started.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}

			<CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} roleNames={allRoleNames} />

			<EditUserDialog user={editUser} onOpenChange={open => !open && setEditUser(null)} />

			<AlertDialog
				open={Boolean(toDeactivate)}
				onOpenChange={open => !open && setToDeactivate(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate user</AlertDialogTitle>
						<AlertDialogDescription>
							{toDeactivate
								? `Deactivate ${toDeactivate.email}? They will be denied protected access until reactivated.`
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
		</div>
	)
}

interface CreateUserDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	roleNames: string[]
}

function CreateUserDialog({ open, onOpenChange, roleNames }: CreateUserDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				{open ? <CreateUserForm roleNames={roleNames} onClose={() => onOpenChange(false)} /> : null}
			</DialogContent>
		</Dialog>
	)
}

function CreateUserForm({ roleNames, onClose }: { roleNames: string[]; onClose: () => void }) {
	const { data: divisions } = useDivisionsQuery()
	const createUser = useCreateUserMutation()

	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [selectedRoles, setSelectedRoles] = useState<string[]>([])
	const [divisionId, setDivisionId] = useState<string>(NO_DIVISION)
	const [formError, setFormError] = useState<string | null>(null)

	function toggleRole(roleName: string, checked: boolean) {
		setSelectedRoles(prev => (checked ? [...prev, roleName] : prev.filter(r => r !== roleName)))
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()
		setFormError(null)

		const trimmedName = name.trim()
		const trimmedEmail = email.trim()
		if (!trimmedName) {
			setFormError("Name is required")
			return
		}
		if (!EMAIL_RE.test(trimmedEmail)) {
			setFormError("Enter a valid email")
			return
		}
		if (password && password.length < 8) {
			setFormError("Password must be at least 8 characters")
			return
		}

		try {
			await createUser.mutateAsync({
				name: trimmedName,
				email: trimmedEmail,
				password: password || undefined,
				roleNames: selectedRoles.length ? selectedRoles : undefined,
				divisionId: divisionId === NO_DIVISION ? null : Number(divisionId),
			})
			toast.success("User created")
			onClose()
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to create user"
			setFormError(message)
			toast.error(message)
		}
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>Create user</DialogTitle>
				<DialogDescription>
					Add a new user. Leave password empty to issue a temporary credential.
				</DialogDescription>
			</DialogHeader>

			<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
				<Field>
					<FieldLabel htmlFor="user-name">Name</FieldLabel>
					<Input
						id="user-name"
						value={name}
						onChange={e => setName(e.target.value)}
						disabled={createUser.isPending}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="user-email">Email</FieldLabel>
					<Input
						id="user-email"
						type="email"
						value={email}
						onChange={e => setEmail(e.target.value)}
						disabled={createUser.isPending}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="user-password">Password (optional)</FieldLabel>
					<Input
						id="user-password"
						type="password"
						value={password}
						onChange={e => setPassword(e.target.value)}
						placeholder="Auto-generate if left blank"
						disabled={createUser.isPending}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="user-division">Division</FieldLabel>
					<Select
						value={divisionId}
						onValueChange={value => {
							if (typeof value === "string") setDivisionId(value)
						}}
						disabled={createUser.isPending}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={NO_DIVISION}>No division</SelectItem>
							{(divisions ?? []).map(division => (
								<SelectItem key={division.id} value={String(division.id)}>
									{division.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				{roleNames.length ? (
					<Field>
						<FieldLabel>Roles</FieldLabel>
						<div className="grid grid-cols-2 gap-2">
							{roleNames.map(roleName => (
								<div key={roleName} className="flex items-center gap-2">
									<Checkbox
										id={`create-role-${roleName}`}
										checked={selectedRoles.includes(roleName)}
										onCheckedChange={checked => toggleRole(roleName, checked === true)}
										disabled={createUser.isPending}
									/>
									<label htmlFor={`create-role-${roleName}`} className="text-sm font-normal">
										{roleName}
									</label>
								</div>
							))}
						</div>
					</Field>
				) : null}

				{formError ? <FieldError>{formError}</FieldError> : null}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose} disabled={createUser.isPending}>
						Cancel
					</Button>
					<Button type="submit" disabled={createUser.isPending}>
						{createUser.isPending ? "Creating..." : "Create user"}
					</Button>
				</DialogFooter>
			</form>
		</>
	)
}

interface EditUserDialogProps {
	user: UserWithRoles | null
	onOpenChange: (open: boolean) => void
}

function EditUserDialog({ user, onOpenChange }: EditUserDialogProps) {
	return (
		<Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				{user ? (
					<EditUserForm key={user.id} user={user} onClose={() => onOpenChange(false)} />
				) : null}
			</DialogContent>
		</Dialog>
	)
}

function EditUserForm({ user, onClose }: { user: UserWithRoles; onClose: () => void }) {
	const updateUser = useUpdateUserMutation()
	const [name, setName] = useState(user.name ?? "")
	const [email, setEmail] = useState(user.email)
	const [formError, setFormError] = useState<string | null>(null)

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()
		setFormError(null)

		const trimmedName = name.trim()
		const trimmedEmail = email.trim()
		if (!trimmedName) {
			setFormError("Name is required")
			return
		}
		if (!EMAIL_RE.test(trimmedEmail)) {
			setFormError("Enter a valid email")
			return
		}

		try {
			await updateUser.mutateAsync({
				userId: user.id,
				name: trimmedName,
				email: trimmedEmail,
			})
			toast.success("User updated")
			onClose()
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to update user"
			setFormError(message)
			toast.error(message)
		}
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>Edit user</DialogTitle>
				<DialogDescription>Update the user&apos;s name and email.</DialogDescription>
			</DialogHeader>

			<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
				<Field>
					<FieldLabel htmlFor="edit-user-name">Name</FieldLabel>
					<Input
						id="edit-user-name"
						value={name}
						onChange={e => setName(e.target.value)}
						disabled={updateUser.isPending}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="edit-user-email">Email</FieldLabel>
					<Input
						id="edit-user-email"
						type="email"
						value={email}
						onChange={e => setEmail(e.target.value)}
						disabled={updateUser.isPending}
					/>
				</Field>

				{formError ? <FieldError>{formError}</FieldError> : null}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose} disabled={updateUser.isPending}>
						Cancel
					</Button>
					<Button type="submit" disabled={updateUser.isPending}>
						{updateUser.isPending ? "Saving..." : "Save changes"}
					</Button>
				</DialogFooter>
			</form>
		</>
	)
}
