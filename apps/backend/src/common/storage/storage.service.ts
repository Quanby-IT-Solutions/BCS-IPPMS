import { Injectable, InternalServerErrorException } from "@nestjs/common"
import { createReadStream, type ReadStream } from "node:fs"
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { isAbsolute, join, normalize, resolve, sep } from "node:path"

import { env } from "@/config/env.config"

/**
 * Stored-object metadata returned after a successful write.
 */
export interface StoredObject {
	/** Logical key (relative path) the object is addressed by. */
	key: string
	/** Byte size of the stored content. */
	size: number
}

/**
 * Storage abstraction (put/get/delete + path resolution).
 *
 * Callers depend on this abstract class; the concrete driver is bound in
 * {@link StorageModule}. A future S3/MinIO driver can be swapped in without
 * touching callers. The multipart upload endpoint (T6) is out of scope here —
 * this is the reusable service only.
 */
export abstract class StorageService {
	/** Persist `data` under `key`, creating parent directories as needed. */
	abstract put(key: string, data: Buffer | Uint8Array | string): Promise<StoredObject>
	/** Read the full contents of `key`. */
	abstract get(key: string): Promise<Buffer>
	/** Open a readable stream for `key` (efficient for downloads). */
	abstract createReadStream(key: string): ReadStream
	/** Whether an object exists at `key`. */
	abstract exists(key: string): Promise<boolean>
	/** Delete `key` if present. No-op when absent (idempotent). */
	abstract delete(key: string): Promise<void>
	/** Resolve the absolute filesystem path for `key`. */
	abstract resolvePath(key: string): string
}

/**
 * Local-disk {@link StorageService}. Roots all objects under `env.STORAGE_ROOT`
 * (relative paths are resolved against the process cwd). Keys are sanitized to
 * prevent path traversal outside the root.
 */
@Injectable()
export class LocalDiskStorageService extends StorageService {
	private readonly root: string

	constructor() {
		super()
		this.root = isAbsolute(env.STORAGE_ROOT)
			? normalize(env.STORAGE_ROOT)
			: resolve(process.cwd(), env.STORAGE_ROOT)
	}

	resolvePath(key: string): string {
		const safeKey = normalize(key).replace(/^([/\\]|\.\.([/\\]|$))+/, "")
		const target = resolve(this.root, safeKey)

		// Defense-in-depth: reject any key that escapes the storage root.
		if (target !== this.root && !target.startsWith(this.root + sep)) {
			throw new InternalServerErrorException("Invalid storage key")
		}

		return target
	}

	async put(key: string, data: Buffer | Uint8Array | string): Promise<StoredObject> {
		const target = this.resolvePath(key)
		await mkdir(join(target, ".."), { recursive: true })

		const buffer =
			typeof data === "string"
				? Buffer.from(data)
				: Buffer.isBuffer(data)
					? data
					: Buffer.from(data)

		await writeFile(target, buffer)
		return { key, size: buffer.byteLength }
	}

	async get(key: string): Promise<Buffer> {
		return readFile(this.resolvePath(key))
	}

	createReadStream(key: string): ReadStream {
		return createReadStream(this.resolvePath(key))
	}

	async exists(key: string): Promise<boolean> {
		try {
			await stat(this.resolvePath(key))
			return true
		} catch {
			return false
		}
	}

	async delete(key: string): Promise<void> {
		// `force` makes a missing file a no-op (idempotent delete).
		await rm(this.resolvePath(key), { force: true })
	}
}
