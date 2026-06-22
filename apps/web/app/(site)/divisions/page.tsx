import type { Metadata } from "next"

import { DivisionsView } from "@/features/divisions/components/divisions-view"

export const metadata: Metadata = {
	title: "Divisions",
}

export default function DivisionsPage() {
	return <DivisionsView />
}
