import { Module } from "@nestjs/common"

import { AuditInterceptor } from "@/shared/interceptors/audit.interceptor"

import { AuditService } from "./audit.service"

/**
 * Provides the audit building blocks: {@link AuditService} for explicit
 * semantic events and {@link AuditInterceptor} for baseline write-path
 * coverage. The interceptor is exported but NOT bound as a global
 * `APP_INTERCEPTOR` here — consumers apply it per-route, or a later ticket
 * registers it globally.
 */
@Module({
	providers: [AuditService, AuditInterceptor],
	exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
