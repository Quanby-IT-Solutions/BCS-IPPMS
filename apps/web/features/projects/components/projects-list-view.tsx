"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Add01Icon, FolderLibraryIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { ProjectStatus } from "@repo/contracts"

import { PageHeader } from "@/core/components/page-header"
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { canAccess, type AccessProfile } from "@/features/dashboard/lib/access"
import { useDivisionsQuery } from "@/features/divisions/api/divisions.hooks"
import { useProjectsQuery } from "@/features/projects/api/projects.hooks"
import { ProjectCreateDialog } from "@/features/projects/components/project-create-dialog"
import {
	formatDate,
	PROJECT_STATUS_LABELS,
	PROJECT_STATUS_VARIANTS,
} from "@/features/projects/lib/project-format"

const STATUS_FILTERS: readonly ProjectStatus[] = ["draft", "in_approval", "active", "closed"]

interface ProjectsListViewProps {
	access: AccessProfile
}

export function ProjectsListView({ access }: ProjectsListViewProps) {
	const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all")
	const [createOpen, setCreateOpen] = useState(false)

	const filters = statusFilter === "all" ? undefined : { status: statusFilter }
	const { data: projects, isLoading, isError, error, refetch } = useProjectsQuery(filters)
	const { data: divisions } = useDivisionsQuery()

	const divisionName = useMemo(() => {
		const map = new Map<number, string>()
		for (const d of divisions ?? []) {
			map.set(d.id, d.name)
		}
		return (id: number | null) => (id !== null ? (map.get(id) ?? `Division #${id}`) : "—")
	}, [divisions])

	const canCreate = canAccess(access, { requiredPermission: "projects:create" })

	return (
		<section className="flex w-full flex-col gap-6">
			<PageHeader
				icon={FolderLibraryIcon}
				title="Projects"
				description="Create proposals and manage the project lifecycle."
				actions={
					canCreate ? (
						<Button size="sm" onClick={() => setCreateOpen(true)}>
							<HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
							New Project
						</Button>
					) : null
				}
			/>

			<div className="flex flex-wrap items-center gap-3">
				<Select
					value={statusFilter}
					onValueChange={value => setStatusFilter(value as ProjectStatus | "all")}
				>
					<SelectTrigger className="w-44">
						<SelectValue>
							{value =>
								value && value !== "all"
									? PROJECT_STATUS_LABELS[value as ProjectStatus]
									: "All statuses"
							}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All statuses</SelectItem>
						{STATUS_FILTERS.map(status => (
							<SelectItem key={status} value={status}>
								{PROJECT_STATUS_LABELS[status]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{isLoading ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-32 w-full" />
				</div>
			) : null}

			{isError ? (
				<div className="flex flex-col items-start gap-2">
					<p className="text-destructive text-sm">
						{error instanceof Error ? error.message : "Failed to load projects"}
					</p>
					<Button size="sm" variant="outline" onClick={() => refetch()}>
						Retry
					</Button>
				</div>
			) : null}

			{projects && projects.length > 0 ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{projects.map(project => (
						<Link key={project.id} href={`/projects/${project.id}`} className="block">
							<Card className="hover:border-primary h-full transition-colors">
								<CardHeader>
									<div className="flex items-start justify-between gap-2">
										<CardTitle className="line-clamp-2">{project.title}</CardTitle>
										<Badge variant={PROJECT_STATUS_VARIANTS[project.status]}>
											{PROJECT_STATUS_LABELS[project.status]}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="flex flex-col gap-2 text-sm">
									<p className="text-muted-foreground line-clamp-2">
										{project.objectives ?? "No objectives recorded."}
									</p>
									<div className="text-muted-foreground flex items-center justify-between text-xs">
										<span>{divisionName(project.divisionId)}</span>
										<span>{formatDate(project.createdAt)}</span>
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			) : null}

			{projects && projects.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<HugeiconsIcon icon={FolderLibraryIcon} strokeWidth={2} />
						</EmptyMedia>
						<EmptyTitle>No projects yet</EmptyTitle>
						<EmptyDescription>
							{canCreate
								? "Create your first proposal to get started."
								: "Projects in your division will appear here."}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}

			<ProjectCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
		</section>
	)
}
