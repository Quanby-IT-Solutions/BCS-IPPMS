/**
 * The credential password policy (Technical Requirements, item 19).
 *
 * The rules are asserted individually because each one is a separate claim in
 * the compliance statement, and through `checkPasswordForPath` because that is
 * the function the auth middleware actually calls — a rule that passes in
 * isolation but is never reached on a route is not enforced.
 */

import { describe, expect, it } from "vitest"

import { checkPasswordForPath } from "./password-policy-guard.js"
import {
	describePasswordPolicy,
	generateCompliantPassword,
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	PASSWORD_RULES,
	validatePassword,
} from "./password-policy.js"

/** Satisfies every rule: length, all four character classes, no identifiers. */
const STRONG = "Tr@nsp4rency!Ops"

describe("password policy bounds", () => {
	it("requires more than Better Auth's default of 8", () => {
		expect(PASSWORD_MIN_LENGTH).toBeGreaterThan(8)
	})

	it("caps length so scrypt cannot be used as a CPU sink", () => {
		expect(PASSWORD_MAX_LENGTH).toBe(128)
	})
})

describe("validatePassword", () => {
	it("accepts a password meeting every rule", () => {
		const result = validatePassword(STRONG)
		expect(result.ok).toBe(true)
		expect(result.failedRuleIds).toEqual([])
		expect(result.message).toBeNull()
	})

	it.each([
		["too short", "Ab3!efgh", "length"],
		["no lowercase", "TR@NSP4RENCY!OPS", "lowercase"],
		["no uppercase", "tr@nsp4rency!ops", "uppercase"],
		["no digit", "Tr@nsparency!Ops", "digit"],
		["no symbol", "Transp4rencyOps1", "symbol"],
	])("rejects a password with %s", (_label, password, expectedRule) => {
		const result = validatePassword(password)
		expect(result.ok).toBe(false)
		expect(result.failedRuleIds).toContain(expectedRule)
	})

	it("rejects a commonly used password even when it meets the composition rules", () => {
		// Passes length, case, digit and symbol — the denylist is what catches it.
		const result = validatePassword("Password@123")
		expect(result.failedRuleIds).toContain("not-common")
	})

	it("rejects a password over the maximum length", () => {
		const result = validatePassword(`${STRONG}${"x".repeat(PASSWORD_MAX_LENGTH)}`)
		expect(result.ok).toBe(false)
		expect(result.failedRuleIds).toContain("max-length")
	})

	it("names every unmet requirement in one message", () => {
		const result = validatePassword("short")
		expect(result.failedLabels.length).toBeGreaterThan(1)
		expect(result.message).toContain("does not meet the policy")
	})

	it("treats a space as a symbol so a passphrase qualifies", () => {
		const result = validatePassword("Bureau Of Comms 7")
		expect(result.failedRuleIds).not.toContain("symbol")
		expect(result.ok).toBe(true)
	})
})

describe("identifier reuse", () => {
	it("rejects a password containing the email local part", () => {
		const result = validatePassword("Delacruz@2026!", { email: "delacruz@bcs.local" })
		expect(result.failedRuleIds).toContain("not-identifier")
	})

	it("rejects a password containing a separated part of the local part", () => {
		const result = validatePassword("Juan!Delacruz26", { email: "juan.delacruz@bcs.local" })
		expect(result.failedRuleIds).toContain("not-identifier")
	})

	it("rejects a password containing a name word", () => {
		const result = validatePassword("Santos@Ippms99", { name: "Maria Santos" })
		expect(result.failedRuleIds).toContain("not-identifier")
	})

	it("ignores identifier fragments too short to be meaningful", () => {
		// "ann" is 3 characters; refusing every password containing it would
		// reject unrelated words for no benefit.
		const result = validatePassword(STRONG, { name: "Ann Lim", email: "an@bcs.local" })
		expect(result.ok).toBe(true)
	})

	it("passes when no identity is supplied", () => {
		expect(validatePassword(STRONG).ok).toBe(true)
	})
})

describe("rule metadata", () => {
	it("gives every rule a unique id so a UI can key a checklist", () => {
		const ids = PASSWORD_RULES.map(rule => rule.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it("describes the policy in prose for help text and the manual", () => {
		const description = describePasswordPolicy()
		expect(description).toContain(String(PASSWORD_MIN_LENGTH))
		expect(description).toContain(String(PASSWORD_MAX_LENGTH))
	})
})

describe("checkPasswordForPath", () => {
	it("checks the password field on sign-up", () => {
		const decision = checkPasswordForPath("/sign-up/email", {
			email: "new@bcs.local",
			password: "weak",
		})
		expect(decision?.ok).toBe(false)
	})

	it.each(["/reset-password", "/change-password", "/set-password"])(
		"checks newPassword on %s",
		path => {
			expect(checkPasswordForPath(path, { newPassword: "weak" })?.ok).toBe(false)
			expect(checkPasswordForPath(path, { newPassword: STRONG })?.ok).toBe(true)
		}
	)

	it("uses the sign-up body's own email for the identifier rule", () => {
		const decision = checkPasswordForPath("/sign-up/email", {
			email: "delacruz@bcs.local",
			password: "Delacruz@2026!",
		})
		expect(decision?.ok).toBe(false)
	})

	it("falls back to the session identity where the body carries none", () => {
		const decision = checkPasswordForPath(
			"/change-password",
			{ newPassword: "Delacruz@2026!" },
			{ email: "delacruz@bcs.local", name: null }
		)
		expect(decision?.ok).toBe(false)
	})

	it("ignores routes that carry no new password", () => {
		// Judging these would reject accounts whose password predates the policy.
		expect(checkPasswordForPath("/sign-in/email", { password: "weak" })).toBeNull()
		expect(checkPasswordForPath("/verify-password", { password: "weak" })).toBeNull()
		expect(checkPasswordForPath("/request-password-reset", { email: "a@b.c" })).toBeNull()
	})

	it("defers to schema validation when the password field is missing", () => {
		expect(checkPasswordForPath("/sign-up/email", { email: "a@b.c" })).toBeNull()
		expect(checkPasswordForPath("/reset-password", {})).toBeNull()
	})
})

describe("generateCompliantPassword", () => {
	it("always produces a password the policy accepts", () => {
		// Run it many times rather than once: the bug this guards against is
		// probabilistic. A flat-alphabet generator omits the symbol class often
		// enough that a single sample would pass while a share of real invites
		// minted credentials the policy would reject.
		for (let i = 0; i < 500; i++) {
			const generated = generateCompliantPassword()
			expect(validatePassword(generated).ok, `failed on: ${generated}`).toBe(true)
		}
	})

	it("never falls below the policy minimum, even when asked for less", () => {
		expect(generateCompliantPassword(4).length).toBe(PASSWORD_MIN_LENGTH)
	})

	it("honours a longer requested length", () => {
		expect(generateCompliantPassword(40)).toHaveLength(40)
	})

	it("excludes glyphs that are ambiguous when read off a screen", () => {
		const samples = Array.from({ length: 200 }, () => generateCompliantPassword())
		expect(samples.join("")).not.toMatch(/[0O1lI]/)
	})

	it("does not return the same password twice", () => {
		const samples = new Set(Array.from({ length: 200 }, () => generateCompliantPassword()))
		expect(samples.size).toBe(200)
	})
})
