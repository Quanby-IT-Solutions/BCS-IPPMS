import type { Metadata } from "next"

import { getAccess } from "@/features/dashboard/server/get-access"
import { ProjectsListView } from "@/features/projects/components/projects-list-view"

export const metadata: Metadata = {
	title: "Projects",
}

export default async function ProjectsPage() {
	const access = await getAccess()

	return <ProjectsListView access={{ roles: access.roles, permissions: access.permissions }} />
}
