import { SecurityCheckIcon } from "@hugeicons/core-free-icons"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Separator } from "@/core/components/ui/separator"
import { Switch } from "@/core/components/ui/switch"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { ShellPage, ShellSection } from "@/features/shells/components/shell-page"

interface MockToggle {
	label: string
	description: string
	enabled: boolean
}

const MOCK_PASSWORD_RULES: readonly MockToggle[] = [
	{ label: "Require uppercase", description: "At least one A–Z character", enabled: true },
	{ label: "Require number", description: "At least one 0–9 character", enabled: true },
	{ label: "Require symbol", description: "At least one special character", enabled: false },
	{ label: "Block reused passwords", description: "Disallow last 5 passwords", enabled: true },
]

const MOCK_AUTH_SETTINGS: readonly MockToggle[] = [
	{
		label: "Multi-factor authentication",
		description: "TOTP-based MFA (placeholder)",
		enabled: false,
	},
	{
		label: "Remember device",
		description: "Skip MFA on trusted devices for 30 days",
		enabled: true,
	},
	{
		label: "Single active session",
		description: "Sign out other devices on login",
		enabled: false,
	},
]

interface MockPolicy {
	name: string
	scope: string
	status: "Enforced" | "Draft"
	updated: string
}

const MOCK_POLICIES: readonly MockPolicy[] = [
	{ name: "Account Lockout", scope: "All users", status: "Enforced", updated: "2026-05-30" },
	{ name: "IP Allowlist", scope: "Administrators", status: "Draft", updated: "2026-06-02" },
	{ name: "Session Timeout", scope: "All users", status: "Enforced", updated: "2026-05-18" },
]

const POLICY_VARIANTS: Record<MockPolicy["status"], "default" | "outline"> = {
	Enforced: "default",
	Draft: "outline",
}

export function SecurityShell() {
	return (
		<ShellPage
			icon={SecurityCheckIcon}
			title="Security"
			description="Password policy, authentication settings, and security policy management."
		>
			<ShellSection
				title="Password Policy"
				description="Complexity requirements for user passwords."
			>
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between gap-4">
						<div className="flex flex-col">
							<span className="text-sm font-medium">Minimum length</span>
							<span className="text-muted-foreground text-xs">
								Characters required for a valid password
							</span>
						</div>
						<Badge variant="secondary">12 characters</Badge>
					</div>
					<Separator />
					{MOCK_PASSWORD_RULES.map(rule => (
						<div key={rule.label} className="flex items-center justify-between gap-4">
							<div className="flex flex-col">
								<span className="text-sm font-medium">{rule.label}</span>
								<span className="text-muted-foreground text-xs">{rule.description}</span>
							</div>
							<Switch defaultChecked={rule.enabled} disabled aria-readonly />
						</div>
					))}
				</div>
			</ShellSection>

			<ShellSection
				title="Authentication"
				description="Session and multi-factor authentication settings."
			>
				<div className="flex flex-col gap-4">
					{MOCK_AUTH_SETTINGS.map(setting => (
						<div key={setting.label} className="flex items-center justify-between gap-4">
							<div className="flex flex-col">
								<span className="text-sm font-medium">{setting.label}</span>
								<span className="text-muted-foreground text-xs">{setting.description}</span>
							</div>
							<Switch defaultChecked={setting.enabled} disabled aria-readonly />
						</div>
					))}
				</div>
			</ShellSection>

			<ShellSection
				title="Security Policy Manager"
				description="Organization-wide security policies."
				actions={
					<Button size="sm" variant="outline" disabled>
						New Policy
					</Button>
				}
			>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Policy</TableHead>
							<TableHead>Scope</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Updated</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{MOCK_POLICIES.map(policy => (
							<TableRow key={policy.name}>
								<TableCell className="font-medium">{policy.name}</TableCell>
								<TableCell className="text-muted-foreground">{policy.scope}</TableCell>
								<TableCell>
									<Badge variant={POLICY_VARIANTS[policy.status]}>{policy.status}</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground">{policy.updated}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</ShellSection>
		</ShellPage>
	)
}
