import { type IconSvgElement } from "@hugeicons/react"

import { PageHeader } from "@/core/components/page-header"
import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"

interface ShellPageProps {
	icon: IconSvgElement
	title: string
	description: string
	children: React.ReactNode
}

/**
 * Presentational scaffold shared by every non-slice "navigable shell" page.
 * Renders the standard PageHeader plus a muted notice making it explicit that
 * these layouts use sample data and are not yet wired to the backend.
 */
export function ShellPage({ icon, title, description, children }: ShellPageProps) {
	return (
		<section className="flex w-full flex-col gap-6">
			<PageHeader
				icon={icon}
				title={title}
				description={description}
				actions={<Badge variant="secondary">Preview</Badge>}
			/>

			<p className="text-muted-foreground bg-muted/40 border-border rounded-lg border border-dashed px-3 py-2 text-xs">
				Sample data — not yet connected. This screen previews the planned layout with mock content.
			</p>

			{children}
		</section>
	)
}

interface ShellSectionProps {
	title: string
	description?: string
	icon?: IconSvgElement
	actions?: React.ReactNode
	className?: string
	children: React.ReactNode
}

/**
 * A titled card section used to group mock content within a shell view.
 */
export function ShellSection({
	title,
	description,
	actions,
	className,
	children,
}: ShellSectionProps) {
	return (
		<Card className={cn("gap-4", className)}>
			<CardHeader className="flex flex-row items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<CardTitle>{title}</CardTitle>
					{description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
				</div>
				{actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	)
}

interface ShellStatCardProps {
	label: string
	value: string
	hint?: string
}

/**
 * Compact KPI/stat card for dashboard-style mock summaries.
 */
export function ShellStatCard({ label, value, hint }: ShellStatCardProps) {
	return (
		<Card className="gap-2">
			<CardContent className="flex flex-col gap-1 pt-1">
				<span className="text-muted-foreground text-xs font-medium">{label}</span>
				<span className="text-2xl font-bold tracking-tight tabular-nums">{value}</span>
				{hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
			</CardContent>
		</Card>
	)
}
