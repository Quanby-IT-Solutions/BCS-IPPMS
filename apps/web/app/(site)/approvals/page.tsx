import { Suspense } from "react"
import type { Metadata } from "next"

import { ApprovalsInboxView } from "@/features/approvals/components/approvals-inbox-view"
import { getAccess } from "@/features/dashboard/server/get-access"

export const metadata: Metadata = {
	title: "My Approvals",
}

export default async function ApprovalsPage() {
	const access = await getAccess()

	return (
		<Suspense>
			<ApprovalsInboxView access={{ roles: access.roles, permissions: access.permissions }} />
		</Suspense>
	)
}
