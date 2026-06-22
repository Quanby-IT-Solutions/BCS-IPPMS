import {
	Injectable,
	type CallHandler,
	type ExecutionContext,
	type NestInterceptor,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { IncomingHttpHeaders } from "http"
import { tap, type Observable } from "rxjs"

import { AuditService } from "@/common/audit/audit.service"
import {
	AUDIT_ACTION_KEY,
	type AuditActionMeta,
} from "@/shared/decorators/audit-action.decorator"

/** HTTP verbs treated as state-changing for baseline write-path coverage. */
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

/**
 * Baseline write-path audit interceptor.
 *
 * Records one audit entry per successful state-changing request. It is a
 * reusable building block — NOT registered globally in this ticket — so it
 * cannot affect existing routes until explicitly applied (per-route via
 * `@UseInterceptors`, or globally in a later ticket).
 *
 * An explicit {@link AuditAction} descriptor on the handler/controller refines
 * the recorded `action`/`module`/`entityType`; otherwise a generic
 * `<METHOD> <path>` action is used. Logging never blocks or fails the request.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
	constructor(
		private readonly reflector: Reflector,
		private readonly auditService: AuditService
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		if (context.getType() !== "http") {
			return next.handle()
		}

		const request = context.switchToHttp().getRequest<{
			method?: string
			originalUrl?: string
			url?: string
			headers: IncomingHttpHeaders
			session?: { user?: { id?: string } }
			user?: { id?: string }
		}>()

		const method = (request.method ?? "GET").toUpperCase()
		const descriptor = this.reflector.getAllAndOverride<AuditActionMeta | undefined>(
			AUDIT_ACTION_KEY,
			[context.getHandler(), context.getClass()]
		)

		// Skip reads with no explicit descriptor — nothing meaningful to record.
		if (!descriptor && !WRITE_METHODS.has(method)) {
			return next.handle()
		}

		const path = request.originalUrl ?? request.url ?? ""
		const actorId = request.session?.user?.id ?? request.user?.id ?? null

		return next.handle().pipe(
			tap({
				next: () => {
					// Fire-and-forget; AuditService swallows its own failures.
					void this.auditService.record({
						actorId,
						action: descriptor?.action ?? `${method} ${path}`,
						module: descriptor?.module ?? null,
						entityType: descriptor?.entityType ?? null,
						metadata: { method, path },
					})
				},
			})
		)
	}
}
