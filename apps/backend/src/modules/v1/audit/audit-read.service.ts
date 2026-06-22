import { Injectable } from "@nestjs/common"
import { and, desc, eq, gte, lte, count, type SQL } from "drizzle-orm"

import {
	type AuditLog,
	type ListAuditLogsQuery,
	type ListAuditLogsResponse,
} from "@repo/contracts"
import { auditLogs } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

const DEFAULT_LIMIT = 50
/** Upper bound on rows returned by a single CSV export. */
const EXPORT_LIMIT = 10_000

@Injectable()
export class AuditReadService {
	/** Paginated, filtered audit log listing. */
	async list(query: ListAuditLogsQuery): Promise<ListAuditLogsResponse> {
		const where = this.buildWhere(query)
		const limit = query.limit ?? DEFAULT_LIMIT
		const offset = query.offset ?? 0

		const [rows, totals] = await Promise.all([
			db
				.select()
				.from(auditLogs)
				.where(where)
				.orderBy(desc(auditLogs.createdAt))
				.limit(limit)
				.offset(offset),
			db.select({ value: count() }).from(auditLogs).where(where),
		])

		return {
			items: rows.map(row => this.toLog(row)),
			total: totals[0]?.value ?? 0,
			limit,
			offset,
		}
	}

	/** Filtered rows for CSV export (no offset; capped at {@link EXPORT_LIMIT}). */
	async exportRows(query: ListAuditLogsQuery): Promise<AuditLog[]> {
		const where = this.buildWhere(query)
		const limit = Math.min(query.limit ?? EXPORT_LIMIT, EXPORT_LIMIT)

		const rows = await db
			.select()
			.from(auditLogs)
			.where(where)
			.orderBy(desc(auditLogs.createdAt))
			.limit(limit)

		return rows.map(row => this.toLog(row))
	}

	private buildWhere(query: ListAuditLogsQuery): SQL | undefined {
		const conditions: SQL[] = []
		if (query.from) conditions.push(gte(auditLogs.createdAt, query.from))
		if (query.to) conditions.push(lte(auditLogs.createdAt, query.to))
		if (query.actorId) conditions.push(eq(auditLogs.actorId, query.actorId))
		if (query.module) conditions.push(eq(auditLogs.module, query.module))
		if (query.entityType) conditions.push(eq(auditLogs.entityType, query.entityType))
		if (query.entityId) conditions.push(eq(auditLogs.entityId, query.entityId))

		return conditions.length > 0 ? and(...conditions) : undefined
	}

	private toLog(row: typeof auditLogs.$inferSelect): AuditLog {
		return {
			id: row.id,
			actorId: row.actorId,
			action: row.action,
			module: row.module,
			entityType: row.entityType,
			entityId: row.entityId,
			metadata: row.metadata ?? null,
			createdAt: row.createdAt,
		}
	}
}
