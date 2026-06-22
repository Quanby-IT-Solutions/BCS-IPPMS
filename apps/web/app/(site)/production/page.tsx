import type { Metadata } from "next"

import { ProductionShell } from "@/features/shells/components/production-shell"

export const metadata: Metadata = {
	title: "Production",
}

export default function ProductionPage() {
	return <ProductionShell />
}
