"use client"

import Link from "next/link"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/core/components/ui/badge"
import { Button, buttonVariants } from "@/core/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/core/components/ui/empty"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { cn } from "@/core/lib/utils"
import { type AccessProfile } from "@/features/dashboard/lib/access"
import { useProjectQuery } from "@/features/projects/api/projects.hooks"
import { ProjectClosureTab } from "@/features/projects/components/project-closure-tab"
import { ProjectConceptualizationTab } from "@/features/projects/components/project-conceptualization-tab"
import { ProjectExecutionTab } from "@/features/projects/components/project-execution-tab"
import { ProjectOverviewTab } from "@/features/projects/components/project-overview-tab"
import { ProjectScheduleTab } from "@/features/projects/components/project-schedule-tab"
import { TaskBoard } from "@/features/projects/components/task-board"
import {
	PROJECT_STATUS_LABELS,
	PROJECT_STATUS_VARIANTS,
} from "@/features/projects/lib/project-format"

interface ProjectHubViewProps {
	projectId: number
	access: AccessProfile
}

export function ProjectHubView({ projectId, access }: ProjectHubViewProps) {
	const { data: project, isLoading, isError, error, refetch } = useProjectQuery(projectId)

	if (isLoading) {
		return (
			<section className="flex w-full flex-col gap-6">
				<Skeleton className="h-9 w-64" />
				<Skeleton className="h-10 w-full max-w-xl" />
				<Skeleton className="h-64 w-full" />
			</section>
		)
	}

	if (isError || !project) {
		return (
			<section className="flex w-full flex-col gap-6">
				<Empty className="border">
					<EmptyHeader>
						<EmptyTitle>Project unavailable</EmptyTitle>
						<EmptyDescription>
							{error instanceof Error ? error.message : "This project could not be loaded."}
						</EmptyDescription>
					</EmptyHeader>
					<div className="flex justify-center gap-2">
						<Button size="sm" variant="outline" onClick={() => refetch()}>
							Retry
						</Button>
						<Link href="/projects" className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
							Back to projects
						</Link>
					</div>
				</Empty>
			</section>
		)
	}

	const readOnly = project.status === "closed"

	return (
		<section className="flex w-full flex-col gap-6">
			<div className="flex flex-col gap-2">
				<Link
					href="/projects"
					className={cn(buttonVariants({ variant: "link", size: "sm" }), "w-fit px-0")}
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
					Back to projects
				</Link>
				<div className="flex flex-wrap items-center gap-3">
					<h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
					<Badge variant={PROJECT_STATUS_VARIANTS[project.status]}>
						{PROJECT_STATUS_LABELS[project.status]}
					</Badge>
				</div>
			</div>

			<Tabs defaultValue="overview" className="w-full">
				<TabsList className="flex-wrap">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="conceptualization">Conceptualization</TabsTrigger>
					<TabsTrigger value="schedule">Schedule</TabsTrigger>
					<TabsTrigger value="tasks">Tasks</TabsTrigger>
					<TabsTrigger value="execution">Execution</TabsTrigger>
					<TabsTrigger value="closure">Closure</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="pt-4">
					<ProjectOverviewTab project={project} access={access} />
				</TabsContent>
				<TabsContent value="conceptualization" className="pt-4">
					<ProjectConceptualizationTab project={project} access={access} />
				</TabsContent>
				<TabsContent value="schedule" className="pt-4">
					<ProjectScheduleTab project={project} access={access} />
				</TabsContent>
				<TabsContent value="tasks" className="pt-4">
					<TaskBoard access={access} projectId={project.id} readOnly={readOnly} />
				</TabsContent>
				<TabsContent value="execution" className="pt-4">
					<ProjectExecutionTab project={project} access={access} />
				</TabsContent>
				<TabsContent value="closure" className="pt-4">
					<ProjectClosureTab project={project} access={access} />
				</TabsContent>
			</Tabs>
		</section>
	)
}
