import type { Metadata } from "next"

import { ApiManagementShell } from "@/features/shells/components/api-management-shell"

export const metadata: Metadata = {
	title: "API Management",
}

export default function ApiManagementPage() {
	return <ApiManagementShell />
}
