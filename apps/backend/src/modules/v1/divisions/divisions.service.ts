import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { eq } from "drizzle-orm"

import {
	type CreateDivisionInput,
	type Division,
	type SetDivisionActiveRequest,
	type UpdateDivisionRequest,
} from "@repo/contracts"
import { divisions } from "@repo/db/schema"

import { AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"
import { RbacCacheService } from "@/common/rbac/rbac-cache.service"

/** Owning module label recorded on division audit events. */
const AUDIT_MODULE = "divisions"

@Injectable()
export class DivisionsService {
	constructor(
		private readonly auditService: AuditService,
		private readonly cacheService: RbacCacheService
	) {}

	async list(): Promise<Division[]> {
		const rows = await db.select().from(divisions).orderBy(divisions.name)
		return rows.map(row => this.toDivision(row))
	}

	async create(payload: CreateDivisionInput, actorId: string | null): Promise<Division> {
		const [existing] = await db.select().from(divisions).where(eq(divisions.name, payload.name))
		if (existing) {
			throw new ORPCError("CONFLICT", { message: `Division "${payload.name}" already exists` })
		}

		const [row] = await db
			.insert(divisions)
			.values({
				name: payload.name,
				description: payload.description ?? null,
				isActive: payload.isActive ?? true,
			})
			.returning()

		if (!row) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Division could not be created" })
		}

		await this.auditService.record({
			actorId,
			action: "division.created",
			module: AUDIT_MODULE,
			entityType: "division",
			entityId: row.id,
			metadata: { name: row.name, isActive: row.isActive },
		})

		return this.toDivision(row)
	}

	async update(payload: UpdateDivisionRequest, actorId: string | null): Promise<Division> {
		const current = await this.getRowOrThrow(payload.id)

		if (payload.name !== undefined && payload.name !== current.name) {
			const [clash] = await db.select().from(divisions).where(eq(divisions.name, payload.name))
			if (clash) {
				throw new ORPCError("CONFLICT", { message: `Division "${payload.name}" already exists` })
			}
		}

		const nextActive = payload.isActive ?? current.isActive
		const activeChanged = nextActive !== current.isActive

		const [row] = await db
			.update(divisions)
			.set({
				name: payload.name ?? current.name,
				description:
					payload.description !== undefined ? payload.description : current.description,
				isActive: nextActive,
				updatedAt: new Date(),
			})
			.where(eq(divisions.id, current.id))
			.returning()

		if (!row) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Division could not be updated" })
		}

		await this.auditService.record({
			actorId,
			action: activeChanged
				? nextActive
					? "division.activated"
					: "division.deactivated"
				: "division.updated",
			module: AUDIT_MODULE,
			entityType: "division",
			entityId: row.id,
			metadata: { name: row.name, isActive: row.isActive },
		})

		// Active-state changes can affect which divisions a scoped principal may
		// act within; flush the per-user RBAC cache so resolution re-runs.
		if (activeChanged) {
			this.cacheService.clear()
		}

		return this.toDivision(row)
	}

	async setActive(payload: SetDivisionActiveRequest, actorId: string | null): Promise<Division> {
		const current = await this.getRowOrThrow(payload.id)

		if (current.isActive === payload.isActive) {
			return this.toDivision(current)
		}

		const [row] = await db
			.update(divisions)
			.set({ isActive: payload.isActive, updatedAt: new Date() })
			.where(eq(divisions.id, current.id))
			.returning()

		if (!row) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Division could not be updated" })
		}

		await this.auditService.record({
			actorId,
			action: payload.isActive ? "division.activated" : "division.deactivated",
			module: AUDIT_MODULE,
			entityType: "division",
			entityId: row.id,
			metadata: { name: row.name, isActive: row.isActive },
		})

		this.cacheService.clear()

		return this.toDivision(row)
	}

	// -------------------------------------------------------------- helpers
	private async getRowOrThrow(id: number) {
		const [row] = await db.select().from(divisions).where(eq(divisions.id, id))
		if (!row) {
			throw new ORPCError("NOT_FOUND", { message: `Division with ID ${id} not found` })
		}
		return row
	}

	private toDivision(row: typeof divisions.$inferSelect): Division {
		return {
			id: row.id,
			name: row.name,
			description: row.description,
			isActive: row.isActive,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}
	}
}
