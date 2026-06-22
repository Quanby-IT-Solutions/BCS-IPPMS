import type { Metadata } from "next"

import { WorkflowBuilderView } from "@/features/approvals/components/workflow-builder-view"

export const metadata: Metadata = {
	title: "Workflow Builder",
}

export default function WorkflowBuilderPage() {
	return <WorkflowBuilderView />
}
