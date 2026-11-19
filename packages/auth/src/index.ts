export { AUTH_CLIENT_ADDRESS_HEADER } from "./client-address.js"
export {
	createAuth,
	getAuth,
	authEnv,
	AUTH_BASE_PATH,
	type Session as AuthSession,
} from "./config.js"
export {
	authSecretSchema,
	isPlaceholderSecret,
	AUTH_SECRET_MIN_LENGTH,
	PLACEHOLDER_SECRET_PREFIXES,
} from "./secret-schema.js"
export { parseOriginList } from "./origin-list.js"
export { setAuthRateLimitStorage, type AuthRateLimitStorage } from "./rate-limit-storage.js"
// Same injection shape as the rate-limit storage above: the backend registers a
// sink at startup so authentication events reach the one audit writer without
// this package depending on NestJS. See auth-events.ts.
export {
	clearAuthEventSink,
	hasAuthEventSink,
	setAuthEventSink,
	type AuthEvent,
	type AuthEventAction,
	type AuthEventSink,
} from "./auth-events.js"
export type { Session, User, Account, Verification } from "better-auth/types"
