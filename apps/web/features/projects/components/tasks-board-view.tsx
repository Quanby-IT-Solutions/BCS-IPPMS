"use client"

import { KanbanIcon } from "@hugeicons/core-free-icons"

import { PageHeader } from "@/core/components/page-header"
import { type AccessProfile } from "@/features/dashboard/lib/access"
import { TaskBoard } from "@/features/projects/components/task-board"

interface TasksBoardViewProps {
	access: AccessProfile
}

export function TasksBoardView({ access }: TasksBoardViewProps) {
	return (
		<section className="flex w-full flex-col gap-6">
			<PageHeader
				icon={KanbanIcon}
				title="Tasks Board"
				description="All project tasks across your division, grouped by status."
			/>
			<TaskBoard access={access} />
		</section>
	)
}
