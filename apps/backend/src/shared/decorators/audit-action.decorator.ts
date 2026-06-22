import { SetMetadata } from "@nestjs/common"

/**
 * Stable metadata key holding the audit descriptor for a route handler.
 * Read by {@link import("../interceptors/audit.interceptor").AuditInterceptor}.
 */
export const AUDIT_ACTION_KEY = "audit_action"

/** Descriptor attached by {@link AuditAction}. */
export interface AuditActionMeta {
	/** Verb / event name recorded for the route (e.g. "project.created"). */
	action: string
	/** Owning module (e.g. "projects"). */
	module?: string
	/** Subject entity type (e.g. "project"). */
	entityType?: string
}

/**
 * Opt a route into baseline audit logging by the {@link AuditInterceptor}.
 *
 * The interceptor is NOT globally enabled in this ticket; routes (or whole
 * controllers) annotate themselves, and a later ticket wires the interceptor
 * where coverage is wanted.
 *
 * @example
 * @AuditAction({ action: "project.created", module: "projects", entityType: "project" })
 */
export const AuditAction = (meta: AuditActionMeta) => SetMetadata(AUDIT_ACTION_KEY, meta)
