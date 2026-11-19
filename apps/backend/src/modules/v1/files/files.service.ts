import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common"
import { randomUUID } from "node:crypto"
import type { ReadStream } from "node:fs"
import { extname } from "node:path"
import { ORPCError } from "@orpc/server"
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm"

import {
	type AttachFileRequest,
	type DeleteFileResponse,
	type FileMetadata,
	type ListFilesQuery,
} from "@repo/contracts"
import { files, projects } from "@repo/db/schema"

import { AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"
import {
	DivisionScopeService,
	type DivisionAccessContext,
} from "@/common/division-scope/division-scope.service"
import { StorageService } from "@/common/storage/storage.service"

const AUDIT_MODULE = "files"
/** Owner type whose access is governed by the owning project's division. */
const PROJECT_OWNER_TYPE = "project"
/** Hard upload ceiling (defense-in-depth; multer has no size limit configured). */
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MiB

/** Minimal shape of a multer-parsed upload (avoids depending on @types/multer). */
export interface UploadedFilePart {
	originalname: string
	mimetype: string
	size: number
	buffer: Buffer
}

@Injectable()
export class FilesService {
	constructor(
		private readonly storage: StorageService,
		private readonly audit: AuditService,
		private readonly divisionScope: DivisionScopeService
	) {}

	// ==========================================================================
	// OWNER-AWARE AUTHORIZATION
	// ==========================================================================

	/**
	 * Resolve the owning project's division for a project-owned file, or `null`
	 * if the project no longer exists.
	 */
	private async resolveOwnerDivision(ownerId: number | null): Promise<number | null | undefined> {
		if (ownerId === null) return undefined
		const [row] = await db
			.select({ divisionId: projects.divisionId })
			.from(projects)
			.where(eq(projects.id, ownerId))
		return row ? row.divisionId : undefined
	}

	/**
	 * Whether `context` may access `row` under owner-aware scoping:
	 * - Admin → always.
	 * - Project-owned → caller must pass the owning project's division check
	 *   (same predicate used by the project lifecycle). A missing project is
	 *   inaccessible to non-admins.
	 * - Unattached (ownerType null) → only the uploader.
	 * - Any other owner type → denied for non-admins (fail-closed).
	 */
	private async canAccess(
		context: DivisionAccessContext,
		row: typeof files.$inferSelect
	): Promise<boolean> {
		if (context.isAdmin) return true

		if (row.ownerType === PROJECT_OWNER_TYPE) {
			const divisionId = await this.resolveOwnerDivision(row.ownerId)
			if (divisionId === undefined) return false
			return this.divisionScope.canAccessDivision(context, divisionId)
		}

		if (row.ownerType === null) {
			return row.uploadedBy === context.userId
		}

		return false
	}

	/** Load a file the caller may access, or throw NOT_FOUND (no existence leak). */
	private async loadAccessible(
		userId: string,
		id: number
	): Promise<{ row: typeof files.$inferSelect; context: DivisionAccessContext }> {
		const context = await this.divisionScope.resolveContext(userId)
		const [row] = await db.select().from(files).where(eq(files.id, id))
		if (!row || !(await this.canAccess(context, row))) {
			throw new ORPCError("NOT_FOUND", { message: `File with ID ${id} not found` })
		}
		return { row, context }
	}

	/** Assert the caller may attach to the target project's division. */
	private async assertCanAccessProjectOwner(
		context: DivisionAccessContext,
		ownerId: number
	): Promise<void> {
		const divisionId = await this.resolveOwnerDivision(ownerId)
		if (divisionId === undefined || !this.divisionScope.canAccessDivision(context, divisionId)) {
			// Fail-closed: do not reveal whether the project exists in another division.
			throw new ORPCError("NOT_FOUND", { message: `Project with ID ${ownerId} not found` })
		}
	}

	/** Persist a multipart upload to storage + a `files` record. (Plain route.) */
	async upload(
		part: UploadedFilePart | undefined,
		owner: { ownerType?: string; ownerId?: number },
		actorId: string
	): Promise<FileMetadata> {
		if (!part || !part.buffer) {
			throw new BadRequestException("No file uploaded")
		}
		if (part.size > MAX_FILE_SIZE) {
			throw new BadRequestException("File exceeds the maximum allowed size")
		}

		// Validate the target owner BEFORE writing storage/DB so we never create
		// a file the actor cannot access (fail-closed on unknown owner types).
		if (owner.ownerType !== undefined && owner.ownerType !== null) {
			const context = await this.divisionScope.resolveContext(actorId)
			if (owner.ownerType === PROJECT_OWNER_TYPE) {
				// Project owners are division-scoped: require access (Admin bypass).
				if (owner.ownerId === undefined) {
					throw new BadRequestException("A project owner id is required")
				}
				await this.assertCanAccessProjectOwner(context, owner.ownerId)
			} else if (!context.isAdmin) {
				// Non-admins may not create files attached to unscoped/unknown
				// owner types; only Admin retains generic owner support.
				throw new ORPCError("FORBIDDEN", {
					message: "You cannot upload files attached to this owner type",
				})
			}
		}

		// Random key prevents collisions and avoids leaking the original name.
		const ext = extname(part.originalname).slice(0, 20)
		const storageKey = `files/${randomUUID()}${ext}`

		await this.storage.put(storageKey, part.buffer)

		let row: typeof files.$inferSelect | undefined
		try {
			;[row] = await db
				.insert(files)
				.values({
					storageKey,
					originalName: part.originalname.slice(0, 255),
					mimeType: part.mimetype || "application/octet-stream",
					size: part.size,
					ownerType: owner.ownerType ?? null,
					ownerId: owner.ownerId ?? null,
					uploadedBy: actorId,
				})
				.returning()
		} catch (error) {
			// Roll back the orphaned object if the DB write fails.
			await this.storage.delete(storageKey)
			throw error
		}

		if (!row) {
			await this.storage.delete(storageKey)
			throw new InternalServerErrorException("File record could not be created")
		}

		await this.audit.record({
			actorId,
			action: "file.uploaded",
			module: AUDIT_MODULE,
			entityType: "file",
			entityId: row.id,
			metadata: {
				originalName: row.originalName,
				size: row.size,
				mimeType: row.mimeType,
				ownerType: row.ownerType,
				ownerId: row.ownerId,
			},
		})

		return this.toMetadata(row)
	}

	/** Resolve a stored object for streaming download. (Plain route.) */
	async getForDownload(
		id: number,
		actorId: string
	): Promise<{ stream: ReadStream; file: typeof files.$inferSelect }> {
		const context = await this.divisionScope.resolveContext(actorId)
		const [row] = await db.select().from(files).where(eq(files.id, id))
		// Fail-closed: inaccessible files surface as not-found (no existence leak).
		if (!row || !(await this.canAccess(context, row))) {
			throw new NotFoundException(`File with ID ${id} not found`)
		}
		if (!(await this.storage.exists(row.storageKey))) {
			throw new NotFoundException("Stored object is missing")
		}

		const stream = this.storage.createReadStream(row.storageKey)

		await this.audit.record({
			actorId,
			action: "file.downloaded",
			module: AUDIT_MODULE,
			entityType: "file",
			entityId: row.id,
			metadata: { originalName: row.originalName },
		})

		return { stream, file: row }
	}

	/** List metadata, optionally filtered by owner; owner-aware scoped. (oRPC.) */
	async list(userId: string, query: ListFilesQuery): Promise<FileMetadata[]> {
		const context = await this.divisionScope.resolveContext(userId)

		const conditions = []
		if (query.ownerType !== undefined) {
			conditions.push(eq(files.ownerType, query.ownerType))
		}
		if (query.ownerId !== undefined) {
			conditions.push(eq(files.ownerId, query.ownerId))
		}

		if (!context.isAdmin) {
			// Explicit project-owner filter: enforce access to that project,
			// failing closed before any rows leak.
			if (query.ownerType === PROJECT_OWNER_TYPE && query.ownerId !== undefined) {
				await this.assertCanAccessProjectOwner(context, query.ownerId)
			} else {
				// Global/other list. Owner-aware visibility for non-admins:
				//   a) unattached files (ownerType null) uploaded by the caller, OR
				//   b) project-owned files whose project is in the caller's division.
				// NOTE: original-uploader is NOT a blanket visibility rule — once a
				// file is attached to a record the caller cannot access, it must
				// drop out of their list. divisionFilter returns a false predicate
				// for a division-less non-admin, so (b) yields zero rows there.
				const accessibleProjectIds = db
					.select({ id: projects.id })
					.from(projects)
					.where(this.divisionScope.divisionFilter(context, projects.divisionId) ?? undefined)

				const ownVisibility = or(
					and(isNull(files.ownerType), eq(files.uploadedBy, userId)),
					and(eq(files.ownerType, PROJECT_OWNER_TYPE), inArray(files.ownerId, accessibleProjectIds))
				)
				if (ownVisibility) conditions.push(ownVisibility)
			}
		}

		const rows = await db
			.select()
			.from(files)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(desc(files.createdAt))

		return rows.map(row => this.toMetadata(row))
	}

	/** Single file metadata by id; owner-aware scoped. (oRPC.) */
	async getMetadata(userId: string, id: number): Promise<FileMetadata> {
		const { row } = await this.loadAccessible(userId, id)
		return this.toMetadata(row)
	}

	/** Attach a file to an owner entity; owner-aware scoped. (oRPC.) */
	async attach(payload: AttachFileRequest, userId: string): Promise<FileMetadata> {
		// Caller must already be able to access the file being attached...
		const { context } = await this.loadAccessible(userId, payload.id)

		// ...and the target owner. Only project owners are division-scoped today.
		if (payload.ownerType === PROJECT_OWNER_TYPE) {
			await this.assertCanAccessProjectOwner(context, payload.ownerId)
		} else if (!context.isAdmin) {
			// Non-admins may not attach to unscoped/unknown owner types.
			throw new ORPCError("FORBIDDEN", {
				message: "You cannot attach files to this owner type",
			})
		}

		const actorId = userId
		const [row] = await db
			.update(files)
			.set({ ownerType: payload.ownerType, ownerId: payload.ownerId })
			.where(eq(files.id, payload.id))
			.returning()

		if (!row) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "File could not be updated" })
		}

		await this.audit.record({
			actorId,
			action: "file.attached",
			module: AUDIT_MODULE,
			entityType: "file",
			entityId: row.id,
			metadata: { ownerType: row.ownerType, ownerId: row.ownerId },
		})

		return this.toMetadata(row)
	}

	/** Delete a file record and its stored object; owner-aware scoped. (oRPC.) */
	async deleteFile(id: number, userId: string): Promise<DeleteFileResponse> {
		const { row } = await this.loadAccessible(userId, id)
		const actorId = userId

		await this.storage.delete(row.storageKey)
		await db.delete(files).where(eq(files.id, id))

		await this.audit.record({
			actorId,
			action: "file.deleted",
			module: AUDIT_MODULE,
			entityType: "file",
			entityId: id,
			metadata: { originalName: row.originalName, ownerType: row.ownerType, ownerId: row.ownerId },
		})

		return { id, deleted: true }
	}

	private toMetadata(row: typeof files.$inferSelect): FileMetadata {
		return {
			id: row.id,
			originalName: row.originalName,
			mimeType: row.mimeType,
			size: row.size,
			ownerType: row.ownerType,
			ownerId: row.ownerId,
			uploadedBy: row.uploadedBy,
			createdAt: row.createdAt,
		}
	}
}
