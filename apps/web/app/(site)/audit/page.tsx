import type { Metadata } from "next"

import { AuditView } from "@/features/audit/components/audit-view"

export const metadata: Metadata = {
	title: "Audit Log",
}

export default function AuditPage() {
	return <AuditView />
}
