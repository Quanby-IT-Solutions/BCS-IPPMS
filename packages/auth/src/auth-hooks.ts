import { createAuthMiddleware } from "better-auth/api"

import { authAuditHook, authAuditPreHook } from "./auth-audit-hook.js"
import { passwordPolicyHook } from "./password-policy-guard.js"

/**
 * The request hooks for the shared Better Auth instance.
 *
 * Better Auth accepts exactly one `before` and one `after` middleware, so the
 * two concerns that need the before phase are composed here rather than in
 * `config.ts`, which keeps the config a declaration and makes the ordering
 * visible in one place.
 *
 * Kept out of `config.ts` for the same reason `buildAuthPlugins` is: the
 * composition can then be asserted without a database connection or
 * `createEnv()`.
 */

/**
 * Order matters.
 *
 * The password policy runs first and may reject, which is correct: if a
 * password is refused there is no authentication outcome to audit, and the
 * `before` phase has no way to record one anyway. The audit pre-hook only
 * captures an identity, so running it second costs nothing on the rejected
 * path and it never throws.
 */
export function buildAuthHooks() {
	const policy = passwordPolicyHook()
	const auditPre = authAuditPreHook()

	return {
		before: createAuthMiddleware(async ctx => {
			await policy(ctx)
			await auditPre(ctx)
		}),
		after: authAuditHook(),
	}
}
