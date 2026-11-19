import { Global, Module } from "@nestjs/common"

import { AuditInterceptor } from "@/shared/interceptors/audit.interceptor"

import { AuditService } from "./audit.service"
import { AuthAuditService } from "./auth-audit.service"

/**
 * Append-only audit trail.
 *
 * Provides {@link AuditService} for explicit semantic events and
 * {@link AuditInterceptor} for baseline write-path coverage. The interceptor
 * is exported but NOT bound as a global `APP_INTERCEPTOR` here — consumers
 * apply it per-route.
 *
 * Global because the trail spans every domain: RBAC, projects, approvals,
 * files and reports all record through {@link AuditService}. Making each one
 * import this module would encourage the shortcut the single-enforcement-point
 * rule exists to prevent — inserting into `audit_logs` directly.
 */
@Global()
@Module({
	// AuthAuditService is a provider, not an export: nothing injects it. It
	// exists to register the auth event sink on init, so instantiating it is
	// the whole point.
	providers: [AuditService, AuditInterceptor, AuthAuditService],
	exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
