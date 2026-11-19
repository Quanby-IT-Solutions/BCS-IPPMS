import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common"

import { clearAuthEventSink, setAuthEventSink, type AuthEvent } from "@repo/auth"

import { AuditService } from "./audit.service"

/** Module label recorded on authentication events. */
export const AUDIT_DOMAIN_AUTH = "auth"

/**
 * Routes Better Auth's authentication events into the audit trail
 * (Technical Requirements, item 18).
 *
 * Authentication happens inside Better Auth, below the domain services that
 * record their own actions, so sign-in, sign-out and failed attempts were
 * absent from `audit_logs` entirely. The auth package emits structured events
 * to a sink instead of writing to the table itself; this service is that sink,
 * so every row in the trail is still written by {@link AuditService} and the
 * append-only rule keeps one enforcement point.
 *
 * Registered on module init rather than at import time so the sink is attached
 * exactly once, by the composition root, and detached on shutdown — otherwise
 * a test that creates two Nest applications would leave the first one's sink
 * installed and attribute events to a closed database pool.
 */
@Injectable()
export class AuthAuditService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(AuthAuditService.name)

	constructor(private readonly auditService: AuditService) {}

	onModuleInit(): void {
		setAuthEventSink(event => this.record(event))
	}

	onModuleDestroy(): void {
		clearAuthEventSink()
	}

	/**
	 * Persist one authentication event.
	 *
	 * Best-effort by construction: the session has already been created or
	 * refused by the time the event arrives, so there is nothing to roll back
	 * and no transaction to join. A failure here is logged rather than
	 * propagated — the emitter swallows it regardless, and an audit write must
	 * not be able to fail a sign-in.
	 */
	private async record(event: AuthEvent): Promise<void> {
		try {
			await this.auditService.record({
				actorId: event.userId,
				action: event.action,
				module: AUDIT_DOMAIN_AUTH,
				entityType: "user",
				// Falls back to the address on a failed attempt, which is the only
				// identifier such an attempt leaves behind.
				entityId: event.userId ?? event.email,
				outcome: event.outcome,
				reason: event.reason,
				metadata: {
					// Recorded for both outcomes: a run of failures from one address
					// against many accounts is the pattern worth seeing.
					email: event.email,
					ipAddress: event.ipAddress,
					userAgent: event.userAgent,
				},
			})
		} catch (error) {
			this.logger.error(
				`Failed to write the audit entry for ${event.action} (${event.outcome})`,
				error instanceof Error ? error.stack : undefined
			)
		}
	}
}
