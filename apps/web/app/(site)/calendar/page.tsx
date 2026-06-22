import type { Metadata } from "next"

import { CalendarShell } from "@/features/shells/components/calendar-shell"

export const metadata: Metadata = {
	title: "Calendar",
}

export default function CalendarPage() {
	return <CalendarShell />
}
