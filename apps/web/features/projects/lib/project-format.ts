import type { MilestoneStatus, ProjectStatus, TaskStatus } from "@repo/contracts"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
	draft: "Draft",
	in_approval: "In Approval",
	active: "Active",
	closed: "Closed",
}

export const PROJECT_STATUS_VARIANTS: Record<ProjectStatus, BadgeVariant> = {
	draft: "secondary",
	in_approval: "outline",
	active: "default",
	closed: "secondary",
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
	todo: "To Do",
	in_progress: "In Progress",
	done: "Done",
}

export const TASK_STATUS_ORDER: readonly TaskStatus[] = ["todo", "in_progress", "done"]

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
	pending: "Pending",
	in_progress: "In Progress",
	done: "Done",
}

export const MILESTONE_STATUS_VARIANTS: Record<MilestoneStatus, BadgeVariant> = {
	pending: "secondary",
	in_progress: "outline",
	done: "default",
}

// Contract date fields are typed as Date, but the oRPC client does not re-run
// the schema transform, so at runtime they arrive as ISO strings. Coerce before
// using any Date method.
type DateLike = Date | string | null | undefined

function toDate(value: DateLike): Date | null {
	if (!value) {
		return null
	}
	return value instanceof Date ? value : new Date(value)
}

/** Renders a Date (or nullable date) as a short human-readable date. */
export function formatDate(value: DateLike): string {
	const date = toDate(value)
	if (!date) {
		return "—"
	}
	return date.toLocaleDateString(undefined, { dateStyle: "medium" })
}

/** Renders a Date (or nullable date) with date + time. */
export function formatDateTime(value: DateLike): string {
	const date = toDate(value)
	if (!date) {
		return "—"
	}
	return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

/** Converts a Date to a `yyyy-mm-dd` value for `<input type="date">`. */
export function toDateInputValue(value: DateLike): string {
	const date = toDate(value)
	if (!date) {
		return ""
	}
	const offset = date.getTimezoneOffset() * 60_000
	return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

/** True when a due date is in the past and the work is not yet done. */
export function isOverdue(dueDate: DateLike, done: boolean): boolean {
	const date = toDate(dueDate)
	if (!date || done) {
		return false
	}
	return date.getTime() < Date.now()
}
