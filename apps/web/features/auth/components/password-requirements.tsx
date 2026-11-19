"use client"

import { CheckmarkCircle02Icon, CircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { PASSWORD_RULES, type PasswordContext } from "@repo/auth/password-policy"

import { cn } from "@/core/lib/utils"

interface PasswordRequirementsProps {
	/** The password as typed. */
	value: string
	/**
	 * Identity the password is being set for, where the form knows it. Enables
	 * the "does not contain your name or email" rule to report live instead of
	 * only on submit.
	 */
	context?: PasswordContext
	className?: string
}

/**
 * Live checklist of the password policy (Technical Requirements, item 19).
 *
 * Shows every rule from the moment the field has focus rather than revealing
 * them as they fail, so the user can satisfy the policy in one pass instead of
 * discovering it a rule at a time. The rules come from the shared policy
 * module, so this list cannot drift from what the server enforces.
 *
 * Unmet rules are not styled as errors while the field is still being typed:
 * an untouched requirement is pending, not wrong.
 */
export function PasswordRequirements({ value, context, className }: PasswordRequirementsProps) {
	if (!value) return null

	return (
		<ul className={cn("flex flex-col gap-1", className)} aria-live="polite">
			{PASSWORD_RULES.map(rule => {
				const met = rule.test(value, context)
				return (
					<li
						key={rule.id}
						className={cn(
							"flex items-center gap-1.5 text-xs transition-colors",
							met ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
						)}
					>
						<HugeiconsIcon
							icon={met ? CheckmarkCircle02Icon : CircleIcon}
							strokeWidth={2}
							className="size-3.5 shrink-0"
						/>
						<span>{rule.label}</span>
						<span className="sr-only">{met ? " — met" : " — not yet met"}</span>
					</li>
				)
			})}
		</ul>
	)
}
