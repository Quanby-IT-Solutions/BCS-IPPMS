import { createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api"

import { emitAuthEvent, type AuthEvent, type AuthEventAction } from "./auth-events.js"
import { AUTH_CLIENT_ADDRESS_HEADER } from "./client-address.js"

/**
 * Emits an audit event for every authentication outcome (spec item 18).
 *
 * Runs as `hooks.after`, which is the only place both outcomes are visible:
 * Better Auth's dispatcher catches an `APIError` from the endpoint and assigns
 * it to `context.returned` before the after-hooks run, so a refused sign-in
 * reaches this middleware as a value rather than as a thrown exception. A
 * `databaseHooks.session.create.after` hook would see successes only, since a
 * failed attempt never creates a session.
 */

/** Auth routes worth an audit entry, and the action each records. */
const AUDITED_PATHS: Readonly<Record<string, AuthEventAction>> = {
	"/sign-in/email": "auth.signin",
	"/sign-out": "auth.signout",
	"/sign-up/email": "auth.signup",
	"/reset-password": "auth.password_reset",
	"/change-password": "auth.password_change",
}

/** Shape of the body fields this hook reads, all optional. */
interface AuditableBody {
	email?: unknown
}

/** Shape of a successful auth response, as far as this hook cares. */
interface AuditableResponse {
	user?: { id?: unknown; email?: unknown }
}

const asString = (value: unknown): string | null =>
	typeof value === "string" && value.length > 0 ? value : null

/**
 * Identity captured before the handler ran, keyed by the request context.
 *
 * `/sign-out` revokes the session and clears its cookie inside the handler, so
 * by the after-hook there is nothing left to attribute the event to — the row
 * would record that *somebody* signed out. The before-hook resolves the user
 * while the cookie is still present and parks it here.
 *
 * A WeakMap so the entry dies with the request; nothing is ever read back for
 * a different one.
 */
const preHandlerIdentity = new WeakMap<object, { userId: string | null; email: string | null }>()

/** Paths whose actor must be resolved before the handler destroys the session. */
const RESOLVE_BEFORE = new Set(["/sign-out"])

/**
 * The `hooks.before` companion.
 *
 * Only resolves an identity; it never rejects, so it cannot turn an audit
 * concern into a failed sign-out. Session lookup failures are swallowed for
 * the same reason.
 */
export function authAuditPreHook() {
	return createAuthMiddleware(async ctx => {
		if (!RESOLVE_BEFORE.has(ctx.path)) return
		try {
			const resolved = await getSessionFromCtx(ctx)
			if (resolved?.user) {
				preHandlerIdentity.set(ctx, {
					userId: asString(resolved.user.id),
					email: asString(resolved.user.email),
				})
			}
		} catch {
			// No session, or an unreadable one. The event is still recorded, just
			// without an actor — which is the honest outcome.
		}
	})
}

/**
 * Resolve the event for one completed request, or null when the path is not
 * audited.
 *
 * Pure and exported so the classification can be asserted per route without
 * standing up an auth instance — the behaviour that matters is that a refusal
 * is recorded as `denied` with a reason, and that a failed attempt still
 * carries the address it was made for.
 */
export function buildAuthEvent(input: {
	path: string
	body: unknown
	returned: unknown
	sessionUserId?: string | null
	sessionUserEmail?: string | null
	ipAddress?: string | null
	userAgent?: string | null
}): AuthEvent | null {
	const action = AUDITED_PATHS[input.path]
	if (!action) return null

	const failed = isAPIError(input.returned)
	const body = (input.body ?? {}) as AuditableBody
	const response = (failed ? null : input.returned) as AuditableResponse | null

	// On success prefer the responding user; on failure the session (for
	// change-password) and then the submitted address, which is all a failed
	// sign-in leaves behind.
	const userId = asString(response?.user?.id) ?? input.sessionUserId ?? null
	const email =
		asString(response?.user?.email) ?? asString(body.email) ?? input.sessionUserEmail ?? null

	return {
		action,
		outcome: failed ? "denied" : "success",
		userId,
		email,
		reason: failed ? errorReason(input.returned) : null,
		ipAddress: input.ipAddress ?? null,
		userAgent: input.userAgent ?? null,
	}
}

/**
 * A short reason for a refusal.
 *
 * Better Auth's message is used as-is: these are its own generic strings
 * ("Invalid email or password"), written not to disclose whether the account
 * exists, so they are safe to persist and are what an auditor needs to tell a
 * wrong password from a locked account.
 */
function errorReason(error: unknown): string {
	if (typeof error === "object" && error !== null) {
		const message = (error as { message?: unknown }).message
		if (typeof message === "string" && message.length > 0) return message
	}
	return "Authentication failed"
}

/** The `hooks.after` middleware. */
export function authAuditHook() {
	return createAuthMiddleware(async ctx => {
		const headers = ctx.headers
		const session = ctx.context.session

		const captured = preHandlerIdentity.get(ctx)

		const event = buildAuthEvent({
			path: ctx.path,
			body: ctx.body,
			returned: ctx.context.returned,
			sessionUserId: captured?.userId ?? session?.user?.id ?? null,
			sessionUserEmail: captured?.email ?? session?.user?.email ?? null,
			// The backend resolves the client address once and forwards it on this
			// header, dropping any inbound value, so the trail records the address
			// the rate limiter keyed on rather than a spoofable one.
			ipAddress:
				headers?.get(AUTH_CLIENT_ADDRESS_HEADER) ?? headers?.get("x-forwarded-for") ?? null,
			userAgent: headers?.get("user-agent") ?? null,
		})

		if (event) await emitAuthEvent(event)
	})
}
