/**
 * Authentication audit events (Technical Requirements, item 18).
 *
 * The classification is what matters: a refused attempt must be recorded as a
 * denial with a reason, and must still carry the address it was aimed at —
 * that is the only identifier a failed sign-in leaves behind, and a run of
 * them against one account is the pattern an auditor looks for.
 */

import { APIError } from "better-auth/api"
import { afterEach, describe, expect, it, vi } from "vitest"

import { buildAuthEvent } from "./auth-audit-hook.js"
import {
	clearAuthEventSink,
	emitAuthEvent,
	hasAuthEventSink,
	setAuthEventSink,
} from "./auth-events.js"

const SUCCESS = { user: { id: "user-1", email: "ana@bcs.local" }, token: "t" }

afterEach(() => {
	clearAuthEventSink()
})

describe("buildAuthEvent", () => {
	it("records a successful sign-in against the responding user", () => {
		const event = buildAuthEvent({
			path: "/sign-in/email",
			body: { email: "ana@bcs.local" },
			returned: SUCCESS,
			ipAddress: "10.0.0.5",
			userAgent: "curl/8",
		})

		expect(event).toMatchObject({
			action: "auth.signin",
			outcome: "success",
			userId: "user-1",
			email: "ana@bcs.local",
			reason: null,
			ipAddress: "10.0.0.5",
			userAgent: "curl/8",
		})
	})

	it("records a failed sign-in as a denial carrying the attempted address", () => {
		const event = buildAuthEvent({
			path: "/sign-in/email",
			body: { email: "ana@bcs.local" },
			returned: new APIError("UNAUTHORIZED", { message: "Invalid email or password" }),
		})

		expect(event?.outcome).toBe("denied")
		expect(event?.reason).toBe("Invalid email or password")
		// No user id is available on a failure; the address is what remains.
		expect(event?.userId).toBeNull()
		expect(event?.email).toBe("ana@bcs.local")
	})

	it("falls back to a generic reason when the error carries no message", () => {
		const event = buildAuthEvent({
			path: "/sign-in/email",
			body: {},
			returned: new APIError("UNAUTHORIZED", {}),
		})
		expect(event?.outcome).toBe("denied")
		expect(event?.reason).toBeTruthy()
	})

	it.each([
		["/sign-out", "auth.signout"],
		["/sign-up/email", "auth.signup"],
		["/reset-password", "auth.password_reset"],
		["/change-password", "auth.password_change"],
	])("maps %s to %s", (path, action) => {
		expect(buildAuthEvent({ path, body: {}, returned: {} })?.action).toBe(action)
	})

	it("attributes a change-password to the session user, who is not in the body", () => {
		const event = buildAuthEvent({
			path: "/change-password",
			body: {},
			returned: {},
			sessionUserId: "user-9",
			sessionUserEmail: "jun@bcs.local",
		})
		expect(event?.userId).toBe("user-9")
		expect(event?.email).toBe("jun@bcs.local")
	})

	it("ignores routes that are not authentication outcomes", () => {
		// A token refresh or a session read is not an auth event; recording them
		// would bury the sign-ins in noise.
		expect(buildAuthEvent({ path: "/get-session", body: {}, returned: {} })).toBeNull()
		expect(buildAuthEvent({ path: "/request-password-reset", body: {}, returned: {} })).toBeNull()
	})
})

describe("the event sink", () => {
	it("is absent until registered, and events are then dropped silently", async () => {
		expect(hasAuthEventSink()).toBe(false)
		// A unit test or standalone use of the package must not throw here.
		await expect(
			emitAuthEvent({
				action: "auth.signin",
				outcome: "success",
				userId: "u",
				email: null,
				reason: null,
				ipAddress: null,
				userAgent: null,
			})
		).resolves.toBeUndefined()
	})

	it("forwards events once registered", async () => {
		const sink = vi.fn()
		setAuthEventSink(sink)
		expect(hasAuthEventSink()).toBe(true)

		await emitAuthEvent({
			action: "auth.signout",
			outcome: "success",
			userId: "u",
			email: null,
			reason: null,
			ipAddress: null,
			userAgent: null,
		})

		expect(sink).toHaveBeenCalledTimes(1)
		expect(sink.mock.calls[0]?.[0]).toMatchObject({ action: "auth.signout" })
	})

	it("never lets a failing sink break authentication", async () => {
		// An audit write that can fail a sign-in is worse than a missing entry.
		setAuthEventSink(() => {
			throw new Error("database down")
		})

		await expect(
			emitAuthEvent({
				action: "auth.signin",
				outcome: "success",
				userId: "u",
				email: null,
				reason: null,
				ipAddress: null,
				userAgent: null,
			})
		).resolves.toBeUndefined()
	})

	it("also swallows an async sink rejection", async () => {
		setAuthEventSink(() => Promise.reject(new Error("timeout")))
		await expect(
			emitAuthEvent({
				action: "auth.signin",
				outcome: "denied",
				userId: null,
				email: "x@y.z",
				reason: "nope",
				ipAddress: null,
				userAgent: null,
			})
		).resolves.toBeUndefined()
	})
})
