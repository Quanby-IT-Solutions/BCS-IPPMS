import { APIError, createAuthMiddleware } from "better-auth/api"

import { validatePassword, type PasswordContext } from "./password-policy.js"

/**
 * Server-side enforcement of the credential password policy.
 *
 * Better Auth checks length (from `emailAndPassword.minPasswordLength` /
 * `maxPasswordLength`) but has no hook for composition rules, so the rules in
 * `password-policy.ts` are applied here as a `hooks.before` middleware.
 *
 * This is the authoritative gate. The web forms apply the same rules for
 * feedback, but nothing reaches a credential write without passing through
 * this middleware first — including the admin user-create path, which calls
 * the same validator directly for the same reason.
 */

/**
 * Where the new password lives in each endpoint's body.
 *
 * Keyed by Better Auth's route path. `/sign-up/email` carries `password`;
 * every reset/change route carries `newPassword`. `/verify-password` and
 * `/request-password-reset` are absent on purpose — the first checks an
 * existing credential and the second carries no password at all, so running
 * the policy over them would reject accounts whose password predates it.
 */
const PASSWORD_FIELD_BY_PATH: Readonly<Record<string, "password" | "newPassword">> = {
	"/sign-up/email": "password",
	"/reset-password": "newPassword",
	"/change-password": "newPassword",
	"/set-password": "newPassword",
}

/** The subset of a request body this guard reads. */
interface PasswordRequestBody {
	password?: unknown
	newPassword?: unknown
	email?: unknown
	name?: unknown
}

const asString = (value: unknown): string | null =>
	typeof value === "string" && value.length > 0 ? value : null

/**
 * Resolve the policy decision for one request.
 *
 * Pure, and exported so the rules can be asserted per route without standing
 * up an auth instance. Returns `null` when the path carries no new password,
 * which the middleware treats as "not ours to judge".
 *
 * `sessionContext` supplies the signed-in user's identity on the
 * change-password and set-password routes, where the body does not carry it.
 * `/reset-password` legitimately has neither: it is authenticated by a token,
 * so the identifier rule simply has nothing to match against there.
 */
export function checkPasswordForPath(
	path: string,
	body: unknown,
	sessionContext?: PasswordContext
): { ok: boolean; message: string | null } | null {
	const field = PASSWORD_FIELD_BY_PATH[path]
	if (!field) return null

	const payload = (body ?? {}) as PasswordRequestBody
	const password = asString(payload[field])

	// No password on a route that should carry one: let Better Auth's own
	// schema validation produce the error. Reporting a policy failure here
	// would mislabel a malformed request as a weak password.
	if (password === null) return null

	const context: PasswordContext = {
		email: asString(payload.email) ?? sessionContext?.email ?? null,
		name: asString(payload.name) ?? sessionContext?.name ?? null,
	}

	const result = validatePassword(password, context)
	return { ok: result.ok, message: result.message }
}

/**
 * The `hooks.before` middleware.
 *
 * Rejects with 400 and the unmet requirements. Naming them is deliberate: a
 * bare "password is invalid" makes a user guess, and the rules are published
 * in the user manual anyway, so withholding them protects nothing.
 */
export function passwordPolicyHook() {
	return createAuthMiddleware(async ctx => {
		const session = ctx.context.session
		const decision = checkPasswordForPath(ctx.path, ctx.body, {
			email: session?.user?.email ?? null,
			name: session?.user?.name ?? null,
		})

		if (decision && !decision.ok) {
			throw new APIError("BAD_REQUEST", {
				message: decision.message ?? "Password does not meet the policy.",
				code: "PASSWORD_POLICY_VIOLATION",
			})
		}
	})
}
