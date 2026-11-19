import { z } from "zod"

import { validatePassword } from "@repo/auth/password-policy"

/**
 * Register form validation.
 *
 * The password rule is the shared policy, not a local copy — see
 * `@repo/auth/password-policy`. The server enforces the same rules in its
 * `hooks.before` gate, so this exists to tell the user what is wrong before a
 * round trip, never as the gate itself.
 *
 * The subpath import matters: the package root loads `config.js`, which
 * validates server env at import time and cannot run in the browser.
 */
export const RegisterSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.email("Please enter a valid email address"),
	password: z.string().superRefine((password, ctx) => {
		// `name` and `email` are not available here, so the identifier rule is
		// checked on the server only. Everything else is reported inline.
		const result = validatePassword(password)
		if (result.ok) return
		for (const label of result.failedLabels) {
			ctx.addIssue({ code: "custom", message: `Password needs: ${label.toLowerCase()}` })
		}
	}),
})

export type Register = z.infer<typeof RegisterSchema>
