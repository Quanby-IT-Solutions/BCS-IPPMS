import { ApiIcon } from "@hugeicons/core-free-icons"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { ShellPage, ShellSection, ShellStatCard } from "@/features/shells/components/shell-page"

interface MockApiKey {
	label: string
	key: string
	scope: string
	status: "Active" | "Revoked"
	created: string
}

const MOCK_API_KEYS: readonly MockApiKey[] = [
	{
		label: "Web Dashboard",
		key: "ipk_live_••••••••3a9f",
		scope: "read",
		status: "Active",
		created: "2026-04-12",
	},
	{
		label: "Mobile App",
		key: "ipk_live_••••••••7c1d",
		scope: "read,write",
		status: "Active",
		created: "2026-05-02",
	},
	{
		label: "Reporting ETL",
		key: "ipk_live_••••••••e2b8",
		scope: "read",
		status: "Revoked",
		created: "2026-02-20",
	},
]

const KEY_STATUS_VARIANTS: Record<MockApiKey["status"], "default" | "secondary"> = {
	Active: "default",
	Revoked: "secondary",
}

interface MockEndpoint {
	method: "GET" | "POST" | "PATCH" | "DELETE"
	path: string
	summary: string
}

const MOCK_ENDPOINTS: readonly MockEndpoint[] = [
	{ method: "GET", path: "/api/v1/projects", summary: "List projects" },
	{ method: "POST", path: "/api/v1/projects", summary: "Create a project" },
	{ method: "GET", path: "/api/v1/projects/{id}/tasks", summary: "List project tasks" },
	{
		method: "PATCH",
		path: "/api/v1/approval-requests/{id}",
		summary: "Act on an approval request",
	},
	{ method: "GET", path: "/api/v1/reports/preview", summary: "Preview a report" },
]

const METHOD_VARIANTS: Record<
	MockEndpoint["method"],
	"default" | "secondary" | "outline" | "destructive"
> = {
	GET: "outline",
	POST: "default",
	PATCH: "secondary",
	DELETE: "destructive",
}

export function ApiManagementShell() {
	return (
		<ShellPage
			icon={ApiIcon}
			title="API Management"
			description="API keys, usage overview, and the documentation portal."
		>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<ShellStatCard label="Active Keys" value="2" hint="1 revoked" />
				<ShellStatCard label="Requests (24h)" value="18,402" hint="+4% vs prev day" />
				<ShellStatCard label="Error Rate" value="0.7%" hint="Last 24 hours" />
				<ShellStatCard label="Avg. Latency" value="142 ms" hint="p50 response" />
			</div>

			<ShellSection
				title="API Keys"
				description="Issued credentials for programmatic access."
				actions={
					<Button size="sm" disabled>
						Generate key
					</Button>
				}
			>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Label</TableHead>
							<TableHead>Key</TableHead>
							<TableHead>Scope</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Created</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{MOCK_API_KEYS.map(item => (
							<TableRow key={item.label}>
								<TableCell className="font-medium">{item.label}</TableCell>
								<TableCell className="font-mono text-xs">{item.key}</TableCell>
								<TableCell className="text-muted-foreground">{item.scope}</TableCell>
								<TableCell>
									<Badge variant={KEY_STATUS_VARIANTS[item.status]}>{item.status}</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground">{item.created}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</ShellSection>

			<ShellSection
				title="API Documentation Portal"
				description="Available endpoints (sample catalog)."
			>
				<div className="flex flex-col gap-2">
					{MOCK_ENDPOINTS.map(endpoint => (
						<div
							key={`${endpoint.method}-${endpoint.path}`}
							className="border-border flex flex-wrap items-center gap-3 rounded-lg border p-3"
						>
							<Badge variant={METHOD_VARIANTS[endpoint.method]} className="w-16 justify-center">
								{endpoint.method}
							</Badge>
							<code className="font-mono text-sm">{endpoint.path}</code>
							<span className="text-muted-foreground ml-auto text-xs">{endpoint.summary}</span>
						</div>
					))}
				</div>
			</ShellSection>
		</ShellPage>
	)
}
