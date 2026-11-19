"use client"

import Link from "next/link"
import {
	ArrowRight01Icon,
	CheckmarkBadge01Icon,
	FolderLibraryIcon,
	InboxCheckIcon,
	SecurityCheckIcon,
	UserGroupIcon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import type { ApprovalRequestSummary } from "@repo/contracts"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"
import { Skeleton } from "@/core/components/ui/skeleton"
import { useIsQueryLoading } from "@/services/tanstack-query/use-query-loading"
import { useApprovalInboxQuery } from "@/features/approvals/api/approvals.hooks"
import { canAccess, type AccessProfile } from "@/features/dashboard/lib/access"
import { getAccessibleNavItems } from "@/features/dashboard/lib/nav-items"
import { useRolesQuery, useUsersQuery } from "@/features/user-management/api/rbac.hooks"

interface DashboardOverviewProps {
	user: {
		name: string | null
		email: string
	}
	access: AccessProfile
}

const MODULE_LABELS: Record<string, string> = {
	projects: "Project",
	job_orders: "Job Order",
}

function formatSubject(item: ApprovalRequestSummary): string {
	const moduleLabel = MODULE_LABELS[item.module] ?? item.module
	return `${moduleLabel} #${item.subjectId}`
}

export function DashboardOverview({ user, access }: DashboardOverviewProps) {
	const canReadUsers = canAccess(access, {
		requiredPermission: ["users:read", "users:manage"],
	})
	const canReadApprovals = canAccess(access, {
		requiredPermission: "approval-requests:read",
	})

	const users = useUsersQuery()
	const roles = useRolesQuery()
	const inbox = useApprovalInboxQuery({ enabled: canReadApprovals })

	// The persisted-cache restore pins `fetchStatus` to `idle`, so raw
	// `isLoading` disagrees with the server render. See `useIsQueryLoading`.
	const isQueryLoading = useIsQueryLoading()

	const firstName = user.name?.trim().split(/\s+/)[0] || "there"
	const pendingApprovals = inbox.data?.length
	const quickActions = getAccessibleNavItems(access).filter(item => item.href !== "/dashboard")

	return (
		<div className="flex w-full flex-col gap-8">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div className="min-w-0">
					<h1 className="text-2xl font-bold tracking-tight">Welcome back, {firstName}</h1>
					<p className="text-muted-foreground text-sm">Here is an overview of your workspace.</p>
				</div>
				{access.roles.length ? (
					<div className="flex flex-wrap gap-1">
						{access.roles.map(role => (
							<Badge key={role} variant="secondary">
								{role}
							</Badge>
						))}
					</div>
				) : null}
			</header>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{canReadApprovals ? (
					<StatCard
						icon={InboxCheckIcon}
						label="Pending approvals"
						value={pendingApprovals}
						hint="Awaiting your action"
						isLoading={inbox.isLoading}
						isError={inbox.isError}
					/>
				) : null}
				<StatCard
					icon={SecurityCheckIcon}
					label="Your permissions"
					value={access.permissions.length}
					hint="Granted on your account"
				/>
				{canReadUsers ? (
					<StatCard
						icon={UserGroupIcon}
						label="Users"
						value={users.data?.length}
						hint="Across all roles"
						isLoading={isQueryLoading(users)}
						isError={users.isError}
					/>
				) : null}
				{canReadUsers ? (
					<StatCard
						icon={UserMultipleIcon}
						label="Roles"
						value={roles.data?.length}
						hint="Defined in the workspace"
						isLoading={isQueryLoading(roles)}
						isError={roles.isError}
					/>
				) : null}
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-2">
							<div className="min-w-0">
								<CardTitle>Pending approvals</CardTitle>
								<CardDescription>Requests waiting on your action.</CardDescription>
							</div>
							<Button
								variant="outline"
								size="sm"
								nativeButton={false}
								render={<Link href="/approvals" />}
							>
								My Approvals
								<HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<PendingApprovals
							enabled={canReadApprovals}
							isLoading={inbox.isLoading}
							isError={inbox.isError}
							items={inbox.data}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Quick actions</CardTitle>
						<CardDescription>Jump to a destination you can access.</CardDescription>
					</CardHeader>
					<CardContent>
						{quickActions.length ? (
							<div className="flex flex-col gap-2">
								{quickActions.slice(0, 6).map(item => (
									<Link
										key={item.href}
										href={item.href}
										className="group/action border-border hover:bg-muted/60 hover:border-ring/40 focus-visible:border-ring focus-visible:ring-ring/50 flex items-center gap-3 rounded-lg border p-2.5 transition-colors outline-none focus-visible:ring-[3px]"
									>
										<div className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
											<HugeiconsIcon icon={item.icon} strokeWidth={2} className="size-4" />
										</div>
										<span className="min-w-0 flex-1 truncate text-sm font-medium">
											{item.label}
										</span>
										<HugeiconsIcon
											icon={ArrowRight01Icon}
											strokeWidth={2}
											className="text-muted-foreground size-4 transition-transform group-hover/action:translate-x-0.5"
										/>
									</Link>
								))}
							</div>
						) : (
							<p className="text-muted-foreground text-sm">No destinations available.</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

interface StatCardProps {
	icon: IconSvgElement
	label: string
	value: number | undefined
	hint: string
	isLoading?: boolean
	isError?: boolean
}

function StatCard({ icon, label, value, hint, isLoading, isError }: StatCardProps) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<CardDescription>{label}</CardDescription>
					<div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md">
						<HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
					</div>
				</div>
				{isLoading ? (
					<Skeleton className="mt-1 h-8 w-16" />
				) : isError ? (
					<p className="text-destructive text-2xl font-bold tabular-nums">—</p>
				) : (
					<p className="text-2xl font-bold tabular-nums">{value ?? 0}</p>
				)}
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground text-xs">{isError ? "Failed to load" : hint}</p>
			</CardContent>
		</Card>
	)
}

interface PendingApprovalsProps {
	enabled: boolean
	isLoading: boolean
	isError: boolean
	items: ApprovalRequestSummary[] | undefined
}

function PendingApprovals({ enabled, isLoading, isError, items }: PendingApprovalsProps) {
	if (!enabled) {
		return (
			<p className="text-muted-foreground text-sm">
				You do not have approval tasks assigned to you.
			</p>
		)
	}

	if (isLoading) {
		return (
			<div className="flex flex-col gap-2">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-4/5" />
			</div>
		)
	}

	if (isError) {
		return <p className="text-destructive text-sm">Failed to load pending approvals.</p>
	}

	if (!items || items.length === 0) {
		return (
			<Empty className="border-0 p-0 text-left">
				<EmptyHeader className="items-start">
					<EmptyMedia variant="icon">
						<HugeiconsIcon icon={CheckmarkBadge01Icon} strokeWidth={2} />
					</EmptyMedia>
					<EmptyTitle>Nothing to approve</EmptyTitle>
					<EmptyDescription>You are all caught up on approvals.</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	return (
		<ul className="flex flex-col divide-y">
			{items.slice(0, 5).map(item => (
				<li key={item.id}>
					<Link
						href={`/approvals?request=${item.id}`}
						className="hover:bg-muted/50 focus-visible:bg-muted/50 -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors outline-none"
					>
						<div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
							<HugeiconsIcon icon={FolderLibraryIcon} strokeWidth={2} className="size-4" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium">{formatSubject(item)}</p>
							<p className="text-muted-foreground truncate text-xs">
								Step {item.currentStepOrder}
								{item.currentStepRoleName ? ` · ${item.currentStepRoleName}` : ""} ·{" "}
								{new Date(item.createdAt).toLocaleDateString()}
							</p>
						</div>
						<Badge variant="secondary" className="shrink-0 capitalize">
							{item.status}
						</Badge>
					</Link>
				</li>
			))}
		</ul>
	)
}
