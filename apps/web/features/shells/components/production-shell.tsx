import { PrinterIcon, Task01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { Badge } from "@/core/components/ui/badge"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { ShellPage, ShellSection } from "@/features/shells/components/shell-page"

type JobStatus = "queued" | "in_progress" | "review" | "done"

const JOB_STATUS_VARIANTS: Record<JobStatus, "secondary" | "default" | "outline"> = {
	queued: "outline",
	in_progress: "default",
	review: "secondary",
	done: "secondary",
}

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
	queued: "Queued",
	in_progress: "In Progress",
	review: "Review",
	done: "Done",
}

interface MockJobOrder {
	id: string
	title: string
	division: string
	status: JobStatus
	due: string
}

const MOCK_JOB_ORDERS: readonly MockJobOrder[] = [
	{
		id: "JO-2041",
		title: "Annual Report 2025 — Print Run",
		division: "Publications",
		status: "in_progress",
		due: "2026-06-18",
	},
	{
		id: "JO-2042",
		title: "Census Form Reproduction",
		division: "Statistics",
		status: "queued",
		due: "2026-06-22",
	},
	{
		id: "JO-2043",
		title: "Training Manual Reprint",
		division: "HR & Training",
		status: "review",
		due: "2026-06-15",
	},
	{
		id: "JO-2044",
		title: "Brochure — Investor Relations",
		division: "Communications",
		status: "done",
		due: "2026-06-10",
	},
]

interface MockAssessment {
	id: string
	job: string
	assessor: string
	complexity: "Low" | "Medium" | "High"
	estimatedHours: number
}

const MOCK_ASSESSMENTS: readonly MockAssessment[] = [
	{ id: "TA-118", job: "JO-2041", assessor: "M. Santos", complexity: "High", estimatedHours: 48 },
	{ id: "TA-119", job: "JO-2042", assessor: "R. Cruz", complexity: "Medium", estimatedHours: 16 },
	{ id: "TA-120", job: "JO-2043", assessor: "L. Reyes", complexity: "Low", estimatedHours: 6 },
]

interface MockFile {
	name: string
	type: string
	size: string
	updatedAt: string
}

const MOCK_FILES: readonly MockFile[] = [
	{ name: "annual-report-cover.ai", type: "Artwork", size: "24.1 MB", updatedAt: "2026-06-09" },
	{ name: "census-form-v3.pdf", type: "Proof", size: "3.4 MB", updatedAt: "2026-06-08" },
	{ name: "training-manual.indd", type: "Layout", size: "58.0 MB", updatedAt: "2026-06-07" },
	{ name: "color-profile.icc", type: "Profile", size: "0.9 MB", updatedAt: "2026-06-01" },
]

interface MockScheduleEntry {
	slot: string
	job: string
	machine: string
	operator: string
}

const MOCK_SCHEDULE: readonly MockScheduleEntry[] = [
	{ slot: "Mon 08:00–12:00", job: "JO-2041", machine: "Offset Press A", operator: "Team 1" },
	{ slot: "Mon 13:00–17:00", job: "JO-2043", machine: "Digital Press B", operator: "Team 2" },
	{ slot: "Tue 08:00–12:00", job: "JO-2042", machine: "Offset Press A", operator: "Team 1" },
	{ slot: "Wed 09:00–15:00", job: "JO-2044", machine: "Bindery Line", operator: "Team 3" },
]

export function ProductionShell() {
	return (
		<ShellPage
			icon={PrinterIcon}
			title="Production"
			description="Job orders, assessments, file handling, and scheduling for the production division."
		>
			<Tabs defaultValue="job-orders">
				<TabsList>
					<TabsTrigger value="job-orders">Job Orders</TabsTrigger>
					<TabsTrigger value="assessment">Task Assessment</TabsTrigger>
					<TabsTrigger value="files">File Repository</TabsTrigger>
					<TabsTrigger value="scheduler">Scheduler</TabsTrigger>
				</TabsList>

				<TabsContent value="job-orders" className="pt-4">
					<ShellSection
						title="Job Order Masterlist"
						description="All print and reproduction job orders across divisions."
					>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>ID</TableHead>
									<TableHead>Title</TableHead>
									<TableHead>Division</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Due</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{MOCK_JOB_ORDERS.map(job => (
									<TableRow key={job.id}>
										<TableCell className="font-medium">{job.id}</TableCell>
										<TableCell>{job.title}</TableCell>
										<TableCell className="text-muted-foreground">{job.division}</TableCell>
										<TableCell>
											<Badge variant={JOB_STATUS_VARIANTS[job.status]}>
												{JOB_STATUS_LABELS[job.status]}
											</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground">{job.due}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</ShellSection>
				</TabsContent>

				<TabsContent value="assessment" className="pt-4">
					<ShellSection
						title="Task Assessment"
						description="Complexity and effort estimates per job order."
					>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{MOCK_ASSESSMENTS.map(item => (
								<div
									key={item.id}
									className="border-border flex flex-col gap-2 rounded-lg border p-3"
								>
									<div className="flex items-center justify-between">
										<span className="font-medium">{item.id}</span>
										<Badge variant="outline">{item.complexity}</Badge>
									</div>
									<div className="text-muted-foreground flex items-center gap-2 text-xs">
										<HugeStat icon={Task01Icon} label={`Job ${item.job}`} />
									</div>
									<div className="text-muted-foreground text-xs">Assessor: {item.assessor}</div>
									<div className="text-sm">
										Estimated: <span className="font-medium">{item.estimatedHours}h</span>
									</div>
								</div>
							))}
						</div>
					</ShellSection>
				</TabsContent>

				<TabsContent value="files" className="pt-4">
					<ShellSection
						title="File Handling Repository"
						description="Source artwork, proofs, and production assets."
					>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>File</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Size</TableHead>
									<TableHead>Updated</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{MOCK_FILES.map(file => (
									<TableRow key={file.name}>
										<TableCell className="font-medium">{file.name}</TableCell>
										<TableCell>
											<Badge variant="outline">{file.type}</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground">{file.size}</TableCell>
										<TableCell className="text-muted-foreground">{file.updatedAt}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</ShellSection>
				</TabsContent>

				<TabsContent value="scheduler" className="pt-4">
					<ShellSection
						title="Production Scheduler"
						description="Planned machine time and operator assignments."
					>
						<ol className="flex flex-col gap-2">
							{MOCK_SCHEDULE.map(entry => (
								<li
									key={`${entry.slot}-${entry.job}`}
									className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
								>
									<div className="flex flex-col">
										<span className="font-medium">{entry.slot}</span>
										<span className="text-muted-foreground text-xs">
											{entry.machine} · {entry.operator}
										</span>
									</div>
									<Badge variant="secondary">{entry.job}</Badge>
								</li>
							))}
						</ol>
					</ShellSection>
				</TabsContent>
			</Tabs>
		</ShellPage>
	)
}

function HugeStat({ icon, label }: { icon: IconSvgElement; label: string }) {
	return (
		<span className="inline-flex items-center gap-1">
			<HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
			{label}
		</span>
	)
}
