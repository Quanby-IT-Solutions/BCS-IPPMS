import { Analytics01Icon } from "@hugeicons/core-free-icons"

import { Badge } from "@/core/components/ui/badge"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { ShellPage, ShellSection, ShellStatCard } from "@/features/shells/components/shell-page"

interface MockKpi {
	metric: string
	value: string
	target: string
	trend: "up" | "down" | "flat"
}

const MOCK_KPIS: readonly MockKpi[] = [
	{ metric: "On-time Delivery", value: "92%", target: "95%", trend: "up" },
	{ metric: "Job Throughput", value: "184/wk", target: "200/wk", trend: "up" },
	{ metric: "Rework Rate", value: "4.1%", target: "<3%", trend: "down" },
	{ metric: "Approval Cycle Time", value: "2.3 days", target: "2 days", trend: "flat" },
]

const TREND_LABELS: Record<MockKpi["trend"], string> = {
	up: "Improving",
	down: "Declining",
	flat: "Stable",
}

const TREND_VARIANTS: Record<MockKpi["trend"], "default" | "secondary" | "outline"> = {
	up: "default",
	down: "secondary",
	flat: "outline",
}

interface MockProgress {
	division: string
	completion: number
}

const MOCK_PROGRESS: readonly MockProgress[] = [
	{ division: "Publications", completion: 78 },
	{ division: "Statistics", completion: 64 },
	{ division: "Communications", completion: 91 },
	{ division: "HR & Training", completion: 47 },
	{ division: "Logistics", completion: 56 },
]

export function AnalyticsShell() {
	return (
		<ShellPage
			icon={Analytics01Icon}
			title="Analytics"
			description="Division performance dashboards, KPI metrics, and progress visualizations."
		>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<ShellStatCard label="Active Projects" value="38" hint="Across 5 divisions" />
				<ShellStatCard label="Completed (MTD)" value="22" hint="+6 vs last month" />
				<ShellStatCard label="Avg. KPI Attainment" value="87%" hint="Target 90%" />
				<ShellStatCard label="Overdue Items" value="5" hint="Needs attention" />
			</div>

			<ShellSection title="KPI Metrics" description="Key performance indicators vs targets.">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Metric</TableHead>
							<TableHead>Current</TableHead>
							<TableHead>Target</TableHead>
							<TableHead>Trend</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{MOCK_KPIS.map(kpi => (
							<TableRow key={kpi.metric}>
								<TableCell className="font-medium">{kpi.metric}</TableCell>
								<TableCell className="tabular-nums">{kpi.value}</TableCell>
								<TableCell className="text-muted-foreground tabular-nums">{kpi.target}</TableCell>
								<TableCell>
									<Badge variant={TREND_VARIANTS[kpi.trend]}>{TREND_LABELS[kpi.trend]}</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</ShellSection>

			<ShellSection title="Progress Visualizer" description="Division completion progress (mock).">
				<div className="flex flex-col gap-4">
					{MOCK_PROGRESS.map(item => (
						<div key={item.division} className="flex flex-col gap-1">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">{item.division}</span>
								<span className="text-muted-foreground tabular-nums">{item.completion}%</span>
							</div>
							<div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
								<div
									className="bg-primary h-full rounded-full"
									style={{ width: `${item.completion}%` }}
								/>
							</div>
						</div>
					))}
				</div>
			</ShellSection>
		</ShellPage>
	)
}
