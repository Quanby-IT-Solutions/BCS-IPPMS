import type { Metadata } from "next"

import { SecurityShell } from "@/features/shells/components/security-shell"

export const metadata: Metadata = {
	title: "Security",
}

export default function SecurityPage() {
	return <SecurityShell />
}
