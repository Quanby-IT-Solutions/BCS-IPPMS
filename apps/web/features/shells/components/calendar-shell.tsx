import { Calendar01Icon } from "@hugeicons/core-free-icons"

import { Badge } from "@/core/components/ui/badge"
import { ShellPage, ShellSection } from "@/features/shells/components/shell-page"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

// Static June 2026 grid. June 1, 2026 falls on a Monday (leading offset of 1).
const LEADING_BLANKS = 1
const DAYS_IN_MONTH = 30

interface MockEvent {
	day: number
	title: string
	tone: "default" | "secondary" | "outline"
}

const MOCK_EVENTS: readonly MockEvent[] = [
	{ day: 3, title: "Production review", tone: "default" },
	{ day: 9, title: "Census dispatch", tone: "secondary" },
	{ day: 12, title: "Quarterly KPI", tone: "outline" },
	{ day: 18, title: "Annual report due", tone: "default" },
	{ day: 24, title: "Storage audit", tone: "secondary" },
]

const EVENTS_BY_DAY = new Map<number, MockEvent[]>()
for (const event of MOCK_EVENTS) {
	const list = EVENTS_BY_DAY.get(event.day) ?? []
	list.push(event)
	EVENTS_BY_DAY.set(event.day, list)
}

interface MockTimelineEntry {
	date: string
	time: string
	title: string
	division: string
}

const MOCK_TIMELINE: readonly MockTimelineEntry[] = [
	{ date: "Jun 12", time: "09:00", title: "Quarterly KPI review", division: "Analytics" },
	{ date: "Jun 18", time: "14:00", title: "Annual Report 2025 deadline", division: "Publications" },
	{
		date: "Jun 22",
		time: "08:30",
		title: "Census form reproduction start",
		division: "Statistics",
	},
	{ date: "Jun 24", time: "10:00", title: "Warehouse storage audit", division: "Logistics" },
]

const MONTH_CELLS = Array.from({ length: LEADING_BLANKS + DAYS_IN_MONTH }, (_, i) =>
	i < LEADING_BLANKS ? null : i - LEADING_BLANKS + 1
)

export function CalendarShell() {
	return (
		<ShellPage
			icon={Calendar01Icon}
			title="Calendar"
			description="Integrated calendar and schedule timeline across divisions."
		>
			<ShellSection title="Integrated Calendar" description="June 2026 (sample events).">
				<div className="grid grid-cols-7 gap-1">
					{WEEKDAYS.map(day => (
						<div
							key={day}
							className="text-muted-foreground px-2 py-1 text-center text-xs font-medium"
						>
							{day}
						</div>
					))}
					{MONTH_CELLS.map((day, index) => {
						if (day === null) {
							return <div key={`blank-${index}`} className="min-h-20 rounded-lg" />
						}
						const events = EVENTS_BY_DAY.get(day) ?? []
						return (
							<div key={day} className="border-border min-h-20 rounded-lg border p-1.5">
								<span className="text-muted-foreground text-xs tabular-nums">{day}</span>
								<div className="mt-1 flex flex-col gap-1">
									{events.map(event => (
										<Badge
											key={event.title}
											variant={event.tone}
											className="w-full justify-start truncate text-[10px]"
										>
											{event.title}
										</Badge>
									))}
								</div>
							</div>
						)
					})}
				</div>
			</ShellSection>

			<ShellSection title="Schedule Timeline" description="Upcoming events in chronological order.">
				<ol className="flex flex-col gap-2">
					{MOCK_TIMELINE.map(entry => (
						<li
							key={`${entry.date}-${entry.title}`}
							className="border-border flex flex-wrap items-center gap-3 rounded-lg border p-3"
						>
							<div className="flex w-20 shrink-0 flex-col">
								<span className="font-medium">{entry.date}</span>
								<span className="text-muted-foreground text-xs tabular-nums">{entry.time}</span>
							</div>
							<div className="min-w-0 flex-1">
								<span className="block truncate font-medium">{entry.title}</span>
								<span className="text-muted-foreground text-xs">{entry.division}</span>
							</div>
						</li>
					))}
				</ol>
			</ShellSection>
		</ShellPage>
	)
}
