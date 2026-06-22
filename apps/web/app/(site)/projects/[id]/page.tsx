import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getAccess } from "@/features/dashboard/server/get-access"
import { ProjectHubView } from "@/features/projects/components/project-hub-view"

export const metadata: Metadata = {
	title: "Project",
}

export default async function ProjectHubPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const projectId = Number(id)

	if (!Number.isInteger(projectId) || projectId <= 0) {
		notFound()
	}

	const access = await getAccess()

	return (
		<ProjectHubView
			projectId={projectId}
			access={{ roles: access.roles, permissions: access.permissions }}
		/>
	)
}
