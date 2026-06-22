import {
	Analytics01Icon,
	ApiIcon,
	Building01Icon,
	Calendar01Icon,
	ChartBarLineIcon,
	CheckmarkBadge01Icon,
	DashboardSquare01Icon,
	DeliveryTruck01Icon,
	FileValidationIcon,
	FolderLibraryIcon,
	KanbanIcon,
	LockKeyIcon,
	PrinterIcon,
	SecurityCheckIcon,
	Task01Icon,
	Ticket01Icon,
	UserMultipleIcon,
	WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons"
import { type IconSvgElement } from "@hugeicons/react"

import { type PermissionName } from "@repo/contracts"

import { canAccess, type AccessProfile, type RoleRequirement } from "./access"

type DashboardHref = `/${string}`

/**
 * Ordered IPPMS sidebar sections. Each section renders as a grouped,
 * collapsible block in the app sidebar; empty (fully permission-gated)
 * sections are omitted.
 */
export const NAV_SECTIONS = [
	"Overview",
	"Project Lifecycle",
	"Approvals",
	"Production & Circulation",
	"Analytics & Calendar",
	"Administration",
] as const

export type NavSection = (typeof NAV_SECTIONS)[number]

/** Sections that start collapsed unless the active route lives inside them. */
const DEFAULT_COLLAPSED_SECTIONS: ReadonlySet<NavSection> = new Set([
	"Production & Circulation",
	"Analytics & Calendar",
])

export function isSectionDefaultOpen(section: NavSection): boolean {
	return !DEFAULT_COLLAPSED_SECTIONS.has(section)
}

export interface DashboardNavItem {
	label: string
	href: DashboardHref
	icon: IconSvgElement
	section: NavSection
	requiredPermission?: PermissionName | readonly PermissionName[]
	requiredRole?: RoleRequirement
}

export interface DashboardNavGroup {
	section: NavSection
	items: DashboardNavItem[]
}

export const navItems: readonly DashboardNavItem[] = [
	// ---- Overview ----------------------------------------------------------
	{
		label: "Dashboard",
		href: "/dashboard",
		icon: DashboardSquare01Icon,
		section: "Overview",
	},
	{
		label: "Submit Ticket",
		href: "/submit-ticket",
		icon: Ticket01Icon,
		section: "Overview",
	},
	{
		label: "Todos / Posts",
		href: "/todos",
		icon: Task01Icon,
		section: "Overview",
		requiredPermission: "posts:read",
	},

	// ---- Project Lifecycle -------------------------------------------------
	{
		label: "Projects",
		href: "/projects",
		icon: FolderLibraryIcon,
		section: "Project Lifecycle",
		requiredPermission: "projects:read",
	},
	{
		label: "Tasks Board",
		href: "/tasks",
		icon: KanbanIcon,
		section: "Project Lifecycle",
		requiredPermission: "project-tasks:read",
	},

	// ---- Approvals ---------------------------------------------------------
	{
		label: "My Approvals",
		href: "/approvals",
		icon: CheckmarkBadge01Icon,
		section: "Approvals",
		requiredPermission: "approval-requests:read",
	},
	{
		label: "Workflow Builder",
		href: "/approvals/workflows",
		icon: WorkflowSquare01Icon,
		section: "Approvals",
		requiredPermission: "approval-workflows:read",
	},

	// ---- Production & Circulation ------------------------------------------
	{
		label: "Production",
		href: "/production",
		icon: PrinterIcon,
		section: "Production & Circulation",
		requiredPermission: "production:read",
	},
	{
		label: "Circulation",
		href: "/circulation",
		icon: DeliveryTruck01Icon,
		section: "Production & Circulation",
		requiredPermission: "circulation:read",
	},

	// ---- Analytics & Calendar ----------------------------------------------
	{
		label: "Analytics",
		href: "/analytics",
		icon: Analytics01Icon,
		section: "Analytics & Calendar",
		requiredPermission: "analytics:read",
	},
	{
		label: "Calendar",
		href: "/calendar",
		icon: Calendar01Icon,
		section: "Analytics & Calendar",
		requiredPermission: "calendar:read",
	},

	// ---- Administration ----------------------------------------------------
	{
		label: "User Management",
		href: "/user-management",
		icon: UserMultipleIcon,
		section: "Administration",
		requiredPermission: ["users:read", "users:manage"],
	},
	{
		label: "Roles & Permissions",
		href: "/roles",
		icon: SecurityCheckIcon,
		section: "Administration",
		requiredPermission: ["roles:read", "permissions:read"],
	},
	{
		label: "Divisions",
		href: "/divisions",
		icon: Building01Icon,
		section: "Administration",
		requiredPermission: "divisions:read",
	},
	{
		label: "Audit Log",
		href: "/audit",
		icon: FileValidationIcon,
		section: "Administration",
		requiredPermission: "audit:read",
	},
	{
		label: "Reports",
		href: "/reports",
		icon: ChartBarLineIcon,
		section: "Administration",
		requiredPermission: "reports:read",
	},
	{
		label: "Security",
		href: "/security",
		icon: LockKeyIcon,
		section: "Administration",
		requiredPermission: "security:read",
	},
	{
		label: "API Management",
		href: "/api-management",
		icon: ApiIcon,
		section: "Administration",
		requiredPermission: "api:read",
	},
]

export const dashboardRouteTitles: readonly Pick<DashboardNavItem, "href" | "label">[] = [
	...navItems.map(({ href, label }) => ({ href, label })),
	{
		label: "Account",
		href: "/account",
	},
]

export function getDashboardRouteTitle(pathname: string): string {
	const exact = dashboardRouteTitles.find(route => route.href === pathname)
	if (exact) {
		return exact.label
	}

	// Longest matching prefix wins so nested routes (e.g. /approvals/workflows)
	// resolve to the most specific entry rather than a shorter ancestor.
	const prefixMatch = [...dashboardRouteTitles]
		.filter(route => pathname.startsWith(`${route.href}/`))
		.sort((a, b) => b.href.length - a.href.length)[0]

	return prefixMatch?.label ?? "Dashboard"
}

export function getAccessibleNavItems(access: AccessProfile): DashboardNavItem[] {
	return navItems.filter(item =>
		canAccess(access, {
			requiredPermission: item.requiredPermission,
			requiredRole: item.requiredRole,
		})
	)
}

export function getAccessibleNavGroups(access: AccessProfile): DashboardNavGroup[] {
	const accessible = getAccessibleNavItems(access)

	return NAV_SECTIONS.map(section => ({
		section,
		items: accessible.filter(item => item.section === section),
	})).filter(group => group.items.length > 0)
}
