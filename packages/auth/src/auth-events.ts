/**
 * Authentication events, for the audit trail.
 *
 * Technical Requirements item 18 asks for a complete audit trail of "user
 * actions, timestamps, and system activities". The domain modules record their
 * own actions through the backend's `AuditService`, but authentication happens
 * inside Better Auth, below that service — so sign-in, sign-out and failed
 * attempts were absent from the trail entirely.
 *
 * This module does NOT write to the database. It emits structured events to a
 * sink the backend registers at startup, which forwards them to `AuditService`
 * like any other domain event. Writing straight to `audit_logs` from here
 * would have been shorter and would have broken the rule that service
 * documents: nothing else inserts into the table, so the append-only
 * guarantee has exactly one enforcement point.
 *
 * It also keeps this package free of NestJS and its DI container, which is why
 * a sink is registered rather than a service injected.
 */

/** What happened. Mirrors the `action` column on `audit_logs`. */
export type AuthEventAction =
	| "auth.signin"
	| "auth.signout"
	| "auth.signup"
	| "auth.password_reset"
	| "auth.password_change"

/** One authentication event, already resolved to success or refusal. */
export interface AuthEvent {
	action: AuthEventAction
	/** "denied" for a refused attempt. A denial is evidence. */
	outcome: "success" | "denied"
	/** The account, when known. Null on a failed attempt for an unknown address. */
	userId: string | null
	/**
	 * The address the attempt was made for.
	 *
	 * Recorded on failures precisely because `userId` is unavailable there:
	 * without it a run of failed sign-ins could not be attributed to a target,
	 * which is the pattern an auditor looks for.
	 */
	email: string | null
	/** Why it was refused. Null on success. */
	reason: string | null
	ipAddress: string | null
	userAgent: string | null
}

/** Receives each event. Registered by the backend; returns void or a promise. */
export type AuthEventSink = (event: AuthEvent) => void | Promise<void>

let sink: AuthEventSink | null = null

/**
 * Register the sink.
 *
 * Called once from the backend's audit module. Replaces any previous sink so a
 * test can install its own and restore with `clearAuthEventSink`.
 */
export function setAuthEventSink(next: AuthEventSink): void {
	sink = next
}

/** Remove the sink. Events emitted afterwards are dropped. */
export function clearAuthEventSink(): void {
	sink = null
}

/** Whether a sink is currently registered. */
export function hasAuthEventSink(): boolean {
	return sink !== null
}

/**
 * Hand an event to the sink.
 *
 * Failures are swallowed and never propagate. The alternative is an audit
 * write that can fail a sign-in, and an authentication outage is a worse
 * outcome than a missing trail entry — the entry is still logged by the sink's
 * own error path. This is the one place in the trail that is best-effort, and
 * it is best-effort because it has nothing to roll back: the session has
 * already been created or refused by the time the event is emitted.
 *
 * No sink registered (a unit test, or the auth package used standalone) is a
 * no-op rather than an error.
 */
export async function emitAuthEvent(event: AuthEvent): Promise<void> {
	if (!sink) return
	try {
		await sink(event)
	} catch {
		// Deliberately silent: see above. The sink logs its own failures.
	}
}
