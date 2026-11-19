import { z } from "zod"

import { validatePassword } from "@repo/auth/password-policy"

/**
 * Reset-password form validation.
 *
 * Applies the shared policy (see `@repo/auth/password-policy`) so the rules a
 * user must satisfy here are the same ones the server's `hooks.before` gate
 * applies to `/reset-password`.
 */
export const ResetPasswordSchema = z
	.object({
		newPassword: z.string().superRefine((password, ctx) => {
			const result = validatePassword(password)
			if (result.ok) return
			for (const label of result.failedLabels) {
				ctx.addIssue({ code: "custom", message: `Password needs: ${label.toLowerCase()}` })
			}
		}),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine(data => data.confirmPassword === data.newPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})

export type ResetPassword = z.infer<typeof ResetPasswordSchema>
