import { Injectable } from "@nestjs/common"
import { eq, sql, type Column, type SQL } from "drizzle-orm"

import { users } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { RbacService } from "@/common/rbac/rbac.service"

/**
 * Resolved division-access context for the current principal.
 *
 * - `isAdmin` holders bypass division filtering entirely (see Tech Plan §1).
 * - A non-admin with `divisionId === null` is fail-closed: division-scoped
 *   queries must return zero rows.
 */
export interface DivisionAccessContext {
	userId: string
	divisionId: number | null
	isAdmin: boolean
}

/**
 * Applies row-level division filtering for division-scoped resources.
 *
 * This is a reusable building block for feature services — it owns no
 * endpoints. Services resolve a context once per request via
 * {@link resolveContext}, then AND {@link divisionFilter} into their queries.
 *
 * Semantics:
 * - Admin → no filter (sees everything).
 * - Non-admin with a division → rows where `column = divisionId`.
 * - Non-admin without a division → fail-closed `false` predicate (no rows).
 */
@Injectable()
export class DivisionScopeService {
	constructor(private readonly rbacService: RbacService) {}

	/** Resolve the division-access context for a user id. */
	async resolveContext(userId: string): Promise<DivisionAccessContext> {
		const isAdmin = await this.rbacService.hasRole(userId, "Admin")

		const [row] = await db
			.select({ divisionId: users.divisionId })
			.from(users)
			.where(eq(users.id, userId))

		return {
			userId,
			divisionId: row?.divisionId ?? null,
			isAdmin,
		}
	}

	/**
	 * Build the division predicate to AND into a scoped query's WHERE clause.
	 *
	 * Returns `undefined` for Admin (apply no filter), `column = divisionId`
	 * for a scoped non-admin, and a constant-false predicate when a non-admin
	 * has no division (fail-closed: zero rows).
	 *
	 * @param column the division foreign-key column on the table being queried.
	 */
	divisionFilter(context: DivisionAccessContext, column: Column): SQL | undefined {
		if (context.isAdmin) return undefined
		if (context.divisionId === null) return sql`false`
		return eq(column, context.divisionId)
	}

	/**
	 * Whether the principal may access rows belonging to `divisionId`. Useful
	 * for single-row authorization (reads of a specific record, writes).
	 */
	canAccessDivision(context: DivisionAccessContext, divisionId: number | null): boolean {
		if (context.isAdmin) return true
		if (context.divisionId === null) return false
		return context.divisionId === divisionId
	}
}
