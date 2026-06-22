import type { Metadata } from "next"

import { AnalyticsShell } from "@/features/shells/components/analytics-shell"

export const metadata: Metadata = {
	title: "Analytics",
}

export default function AnalyticsPage() {
	return <AnalyticsShell />
}
