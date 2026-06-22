import type { Metadata } from "next"

import { CirculationShell } from "@/features/shells/components/circulation-shell"

export const metadata: Metadata = {
	title: "Circulation",
}

export default function CirculationPage() {
	return <CirculationShell />
}
