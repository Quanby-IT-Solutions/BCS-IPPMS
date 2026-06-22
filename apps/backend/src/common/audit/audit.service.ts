import { Injectable, Logger } from "@nestjs/common"

import { auditLogs } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

/**
 * A semantic audit event. `action` is required (e.g. `"approved"`,
 * `"project.created"`); everything else is optional context.
 */
export interface AuditEvent {
	/** Who performed the action. Null/undefined for system/anonymous actions. */
	actorId?: string | null
	/** Verb / event name (e.g. "created", "approved", "deleted"). */
	action: string
	/** Owning module (e.g. "projects", "approvals"). */
	module?: string | null
	/** Subject entity type (e.g. "project", "approval_request"). */
	entityType?: string | null
	/** Subject entity id (stringified). */
	entityId?: string | number | null
	/** Arbitrary structured context, persisted as jsonb. */
	metadata?: Record<string, unknown> | null
}

/**
 * Writes audit records to the `audit_logs` table (T1).
 *
 * Two consumers:
 * - The {@link import("../../shared/interceptors/audit.interceptor").AuditInterceptor}
 *   for baseline write-path coverage.
 * - Feature services calling {@link record} directly for rich semantic events
 *   ("approved proposal #12").
 *
 * Writes are best-effort: a logging failure must never break the underlying
 * request, so {@link record} swallows and logs DB errors.
 */
@Injectable()
export class AuditService {
	private readonly logger = new Logger(AuditService.name)

	async record(event: AuditEvent): Promise<void> {
		try {
			await db.insert(auditLogs).values({
				actorId: event.actorId ?? null,
				action: event.action,
				module: event.module ?? null,
				entityType: event.entityType ?? null,
				entityId: event.entityId === null || event.entityId === undefined ? null : String(event.entityId),
				metadata: event.metadata ?? null,
			})
		} catch (error) {
			this.logger.error(
				`Failed to write audit log for action "${event.action}": ${
					error instanceof Error ? error.message : String(error)
				}`
			)
		}
	}
}
