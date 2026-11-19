import { Injectable, Logger } from "@nestjs/common"

import { auditLogs } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

/**
 * A database handle that may be either the pool or an open transaction.
 *
 * Callers pass their transaction so the audit row commits or rolls back with
 * the mutation it describes. Typed structurally rather than as Drizzle's
 * `PgTransaction` because the pool and a transaction share the query surface
 * used here but not their full types.
 */
export type AuditDb = Pick<typeof db, "insert">

/** Domain tag for RBAC events. Kept here so callers cannot drift on spelling. */
export const AUDIT_DOMAIN_RBAC = "rbac"

/** Whether the attempt succeeded or was refused. */
export type AuditOutcome = "success" | "denied"

/**
 * A semantic audit event. `action` is required (e.g. `"approved"`,
 * `"project.created"`); everything else is optional context.
 */
export interface AuditEvent {
	/** Who performed the action. Null/undefined for system/anonymous actions. */
	actorId?: string | null
	/** Verb / event name (e.g. "created", "approved", "role.assign"). */
	action: string
	/** Owning module (e.g. "projects", "approvals", "rbac"). */
	module?: string | null
	/**
	 * Alias for {@link module}, accepted so upstream-template call sites that
	 * speak in domains record without rewording. `module` wins if both are set.
	 */
	domain?: string | null
	/** Subject entity type (e.g. "project", "approval_request", "role"). */
	entityType?: string | null
	/** Subject entity id (stringified). */
	entityId?: string | number | null
	/** Alias for {@link entityType}, for upstream-template call sites. */
	targetType?: string | null
	/** Alias for {@link entityId}, for upstream-template call sites. */
	targetId?: string | number | null
	/** Defaults to "success"; pass "denied" to record a refused attempt. */
	outcome?: AuditOutcome
	/** State before and after the action. Shape is per-action. */
	oldValue?: unknown
	newValue?: unknown
	/** Why the attempt was refused, for denials. */
	reason?: string | null
	/** Arbitrary structured context, persisted as jsonb. */
	metadata?: Record<string, unknown> | null
}

const asId = (value: string | number | null | undefined): string | null =>
	value === null || value === undefined ? null : String(value)

/**
 * The single append-only audit trail, writing to `audit_logs`.
 *
 * Nothing else inserts into that table directly, so the append-only rule has
 * exactly one enforcement point. There is no update or delete method here, and
 * none may be added — a log the application can rewrite is not evidence.
 *
 * Two write modes, and the difference matters:
 *
 * - **Transactional** — pass the caller's `tx`. The audit row commits or rolls
 *   back with the mutation it describes, so a privileged change can never
 *   commit unrecorded. Use this for anything that writes.
 * - **Best-effort** — omit `tx`. A failure is logged and swallowed so it cannot
 *   break the request. Correct only for events with nothing to roll back: a
 *   denial that rejected before any write, or a read that is merely noted.
 */
@Injectable()
export class AuditService {
	private readonly logger = new Logger(AuditService.name)

	private values(event: AuditEvent): typeof auditLogs.$inferInsert {
		return {
			actorId: event.actorId ?? null,
			action: event.action,
			module: event.module ?? event.domain ?? null,
			entityType: event.entityType ?? event.targetType ?? null,
			entityId: asId(event.entityId ?? event.targetId),
			outcome: event.outcome ?? "success",
			oldValue: event.oldValue ?? null,
			newValue: event.newValue ?? null,
			reason: event.reason ?? null,
			metadata: event.metadata ?? null,
		}
	}

	/**
	 * Append one entry.
	 *
	 * With `tx`, a failed insert propagates and rolls the caller's mutation
	 * back. Without it, a failure is logged and swallowed.
	 */
	async record(event: AuditEvent, tx?: AuditDb): Promise<void> {
		if (tx) {
			await tx.insert(auditLogs).values(this.values(event))
			return
		}

		try {
			await db.insert(auditLogs).values(this.values(event))
		} catch (error) {
			this.logger.error(
				`Failed to write audit log for action "${event.action}": ${
					error instanceof Error ? error.message : String(error)
				}`
			)
		}
	}

	/**
	 * Record a refused attempt. A denial is evidence, so it is logged like any
	 * other event — best-effort, because a rejection has nothing to roll back.
	 */
	async recordDenial(event: Omit<AuditEvent, "outcome">): Promise<void> {
		await this.record({ ...event, outcome: "denied" })
	}
}
