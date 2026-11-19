/**
 * Credential password policy.
 *
 * Section VII of the bidding documents requires a "secure authentication
 * mechanism including password policy enforcement" (Technical Requirements,
 * item 19). Better Auth on its own only checks length, so the composition
 * rules live here.
 *
 * This module is deliberately free of environment reads, database access and
 * Better Auth imports so it can be shared by three callers that cannot all
 * load the server config:
 *
 *   - the auth server, which enforces it (see `hooks.before` in config.ts),
 *   - the web register / reset / change-password forms, which explain it,
 *   - the backend's admin user-create path, which must not mint a credential
 *     the sign-in flow would then reject.
 *
 * Exported through the `@repo/auth/password-policy` subpath for the same
 * reason `secret-schema` is: importing the package root pulls `config.js`,
 * which validates env at import time.
 *
 * Enforcement is server-side. The client copy is UX, never the gate.
 */

/** A single rule the policy checks. */
export interface PasswordRule {
	/** Stable id, so a UI can key a checklist off it. */
	readonly id: string
	/** Human-readable requirement, phrased as the thing the password must do. */
	readonly label: string
	/** True when `password` satisfies this rule. */
	readonly test: (password: string, context?: PasswordContext) => boolean
}

/**
 * Identity the password is being set for.
 *
 * Supplied where it is known so the policy can refuse a password built out of
 * the account's own identifiers — the first thing an attacker guesses.
 */
export interface PasswordContext {
	email?: string | null
	name?: string | null
}

/**
 * Minimum length.
 *
 * 12 rather than Better Auth's default 8. The system carries project,
 * approval and audit records for a government bureau, and the accounts are
 * staff accounts rather than public sign-ups, so the usability cost of four
 * more characters is small next to the exposure.
 */
export const PASSWORD_MIN_LENGTH = 12

/**
 * Maximum length.
 *
 * Matches Better Auth's own ceiling. It is a denial-of-service bound, not a
 * security one: every candidate is run through scrypt, so an unbounded input
 * is CPU the caller gets to spend for free.
 */
export const PASSWORD_MAX_LENGTH = 128

/**
 * Passwords refused outright regardless of composition.
 *
 * Deliberately short. This is not a breach corpus — it exists to catch the
 * handful of strings that pass the composition rules while being the first
 * thing anyone tries. A real corpus check (Have I Been Pwned) would send a
 * hash prefix to a third party, which is a data-egress decision for the
 * Bureau to make rather than a default to ship.
 */
const DENYLIST = new Set([
	"password1234",
	"password@123",
	"passw0rd@123",
	"qwerty123456",
	"administrator",
	"ippms@12345",
	"welcome@1234",
	"changeme@123",
	"letmein@1234",
])

/** Longest identifier fragment worth refusing; shorter is noise. */
const MIN_IDENTIFIER_FRAGMENT = 4

/**
 * Identifier fragments drawn from the account's own email and name.
 *
 * The email local part and each name word, lowercased. Fragments shorter than
 * {@link MIN_IDENTIFIER_FRAGMENT} are dropped: refusing any password
 * containing "ann" would reject "Transparency@2026" for no benefit.
 */
function identifierFragments(context?: PasswordContext): string[] {
	if (!context) return []

	const fragments: string[] = []

	const email = context.email?.trim().toLowerCase()
	if (email) {
		const localPart = email.split("@")[0] ?? ""
		// Split on separators too: "juan.delacruz" yields the parts someone
		// would actually reuse, not just the whole run.
		for (const part of [localPart, ...localPart.split(/[._+-]+/)]) {
			if (part.length >= MIN_IDENTIFIER_FRAGMENT) fragments.push(part)
		}
	}

	const name = context.name?.trim().toLowerCase()
	if (name) {
		for (const word of name.split(/\s+/)) {
			if (word.length >= MIN_IDENTIFIER_FRAGMENT) fragments.push(word)
		}
	}

	return [...new Set(fragments)]
}

/**
 * The policy, in the order a form should display it.
 *
 * Order is presentation only; {@link validatePassword} evaluates all of them.
 */
export const PASSWORD_RULES: readonly PasswordRule[] = [
	{
		id: "length",
		label: `At least ${PASSWORD_MIN_LENGTH} characters`,
		test: password => password.length >= PASSWORD_MIN_LENGTH,
	},
	{
		id: "lowercase",
		label: "A lowercase letter",
		test: password => /\p{Ll}/u.test(password),
	},
	{
		id: "uppercase",
		label: "An uppercase letter",
		test: password => /\p{Lu}/u.test(password),
	},
	{
		id: "digit",
		label: "A number",
		test: password => /\p{Nd}/u.test(password),
	},
	{
		id: "symbol",
		// Anything that is not a letter or a number counts, space included, so a
		// passphrase satisfies this without hunting for a punctuation key.
		label: "A symbol or space",
		test: password => /[^\p{L}\p{N}]/u.test(password),
	},
	{
		id: "not-common",
		label: "Not a commonly used password",
		test: password => !DENYLIST.has(password.trim().toLowerCase()),
	},
	{
		id: "not-identifier",
		label: "Does not contain your name or email",
		test: (password, context) => {
			const lowered = password.toLowerCase()
			return !identifierFragments(context).some(fragment => lowered.includes(fragment))
		},
	},
]

/** Outcome of checking a password against {@link PASSWORD_RULES}. */
export interface PasswordValidation {
	/** True when every rule passes. */
	ok: boolean
	/** Ids of the rules that failed, in {@link PASSWORD_RULES} order. */
	failedRuleIds: string[]
	/** Labels of the rules that failed, for display. */
	failedLabels: string[]
	/** One sentence naming every unmet requirement. Safe to show a caller. */
	message: string | null
}

/**
 * Check a password against the policy.
 *
 * Over-long input is reported through the same channel as everything else
 * rather than thrown: callers treat one shape for every rejection.
 */
export function validatePassword(password: string, context?: PasswordContext): PasswordValidation {
	const failed = PASSWORD_RULES.filter(rule => !rule.test(password, context))

	// Checked outside the rule list: it is a ceiling, and showing "at most 128
	// characters" in a requirements checklist that a 12-character password
	// already satisfies reads as a warning rather than a rule.
	const tooLong = password.length > PASSWORD_MAX_LENGTH

	const failedLabels = failed.map(rule => rule.label)
	if (tooLong) failedLabels.push(`At most ${PASSWORD_MAX_LENGTH} characters`)

	const failedRuleIds = failed.map(rule => rule.id)
	if (tooLong) failedRuleIds.push("max-length")

	return {
		ok: failedRuleIds.length === 0,
		failedRuleIds,
		failedLabels,
		message: failedRuleIds.length
			? `Password does not meet the policy: ${failedLabels.join(", ").toLowerCase()}.`
			: null,
	}
}

/** Character pools used to build a generated password, one per class rule. */
const POOLS = {
	lower: "abcdefghijkmnopqrstuvwxyz", // no l
	upper: "ABCDEFGHJKLMNPQRSTUVWXYZ", // no I, O
	digit: "23456789", // no 0, 1
	symbol: "!@#$%^&*?-_=+",
} as const

/** Unbiased index into `max` using Web Crypto, available in Node and browsers. */
function randomIndex(max: number): number {
	// Rejection sampling: taking `value % max` would favour the low indices
	// whenever 256 is not a multiple of max.
	const limit = Math.floor(256 / max) * max
	const buffer = new Uint8Array(1)
	for (;;) {
		crypto.getRandomValues(buffer)
		const value = buffer[0] ?? 0
		if (value < limit) return value % max
	}
}

const pick = (pool: string): string => pool.charAt(randomIndex(pool.length))

/**
 * Generate a password that satisfies the policy by construction.
 *
 * Used for invite-style account creation, where an administrator creates an
 * account without choosing a password. Generating from a flat alphabet would
 * not do: a 32-character base64url string contains no symbol roughly a third
 * of the time, so a share of generated credentials would fail the very policy
 * the account is held to, and the holder could never be told their password
 * was compliant. Seeding one character from each required class and filling
 * the rest from the union removes that whole class of flake.
 *
 * Ambiguous glyphs (0/O, 1/l/I) are excluded because these passwords get read
 * off a screen and typed somewhere else.
 */
export function generateCompliantPassword(length = 20): string {
	const target = Math.max(length, PASSWORD_MIN_LENGTH)
	const union = POOLS.lower + POOLS.upper + POOLS.digit + POOLS.symbol

	// One guaranteed character per class, then fill.
	const characters = [pick(POOLS.lower), pick(POOLS.upper), pick(POOLS.digit), pick(POOLS.symbol)]
	while (characters.length < target) characters.push(pick(union))

	// Fisher-Yates, so the guaranteed characters are not always in front.
	for (let i = characters.length - 1; i > 0; i--) {
		const j = randomIndex(i + 1)
		const a = characters[i] as string
		const b = characters[j] as string
		characters[i] = b
		characters[j] = a
	}

	return characters.join("")
}

/**
 * The policy as one sentence, for help text and the user manual.
 */
export function describePasswordPolicy(): string {
	return (
		`Passwords must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters and include ` +
		`a lowercase letter, an uppercase letter, a number and a symbol. They must not be a ` +
		`commonly used password, and must not contain your name or email address.`
	)
}
