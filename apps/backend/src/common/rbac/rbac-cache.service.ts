import { Injectable } from "@nestjs/common"
import { LRUCache } from "lru-cache"

export type ResolvedPermissionSet = {
	roleNames: Set<string>
	permissionNames: Set<string>
	/**
	 * Account active flag resolved alongside roles/permissions. False when the
	 * user is deactivated or does not exist (fail-closed); the RbacGuard denies
	 * protected access for inactive principals.
	 */
	active: boolean
}

@Injectable()
export class RbacCacheService {
	private readonly cache: LRUCache<string, ResolvedPermissionSet>

	constructor() {
		this.cache = new LRUCache<string, ResolvedPermissionSet>({
			max: 1000,
			ttl: 60_000,
			ttlAutopurge: false,
		})
	}

	get(userId: string): ResolvedPermissionSet | undefined {
		return this.cache.get(userId)
	}

	set(userId: string, set: ResolvedPermissionSet): void {
		this.cache.set(userId, set)
	}

	invalidate(userId: string): void {
		this.cache.delete(userId)
	}

	/**
	 * Drop cached entries for a specific set of users. Used when a write affects
	 * a known, bounded group (e.g. reassigning a division to several users, or
	 * removing a role from a handful of members) without flushing the whole
	 * cache. A `null`/`undefined` id in the list is ignored.
	 */
	invalidateUsers(userIds: ReadonlyArray<string | null | undefined>): void {
		for (const userId of userIds) {
			if (userId) this.cache.delete(userId)
		}
	}

	/**
	 * Drop every cached entry. Used after role/permission changes that affect
	 * the effective access of many users at once (the cache is keyed per user,
	 * so a single role edit cannot be invalidated by user id alone).
	 */
	clear(): void {
		this.cache.clear()
	}
}
