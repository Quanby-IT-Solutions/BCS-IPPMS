import type { Metadata } from "next"

import { getAccess } from "@/features/dashboard/server/get-access"
import { TasksBoardView } from "@/features/projects/components/tasks-board-view"

export const metadata: Metadata = {
	title: "Tasks Board",
}

export default async function TasksPage() {
	const access = await getAccess()

	return <TasksBoardView access={{ roles: access.roles, permissions: access.permissions }} />
}
