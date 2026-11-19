import {
	AllowlistEntry,
	EvaluatedFeatureFlag,
	FEATURE_FLAG_KEYS,
	FeatureFlagKey,
	FeatureFlagValue,
} from '@tldraw/dotcom-shared'
import { exhaustiveSwitchError } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { getAuth } from './tla/getAuth'

function getFlagDefaults(): Record<FeatureFlagKey, FeatureFlagValue> {
	return {
		rum_enabled: {
			type: 'percentage',
			percentage: 0,
			enabled: false,
			description: 'Real User Monitoring for editor performance metrics',
		},
		load_rum: {
			type: 'percentage',
			// Master toggle on, 0%: turning it on for a debugging session is one percentage change in
			// the admin panel, no deploy. Users with a @tldraw.com email send it regardless.
			percentage: 0,
			enabled: true,
			description:
				'Send the per-step first_load and file_load timing events (client marks + sync server echo) to PostHog. Users with a @tldraw.com email always send them, regardless of this flag',
		},
		libraries: {
			type: 'allowlist',
			users: [],
			allowEveryone: false,
			description:
				'Shows the libraries UI, which is still being built. The list starts empty, so nobody sees it until they are added. A change reaches a tab when it next reloads',
		},
		headless_shadow: {
			type: 'percentage',
			// 0% by default, and inert anyway until the HEADLESS_WORKER binding exists. Bucketed per user:
			// the sync worker passes the caller's user id, so a stable sample of accounts runs the shadow.
			percentage: 0,
			enabled: true,
			description:
				'Runs the headless editor over an MCP page read in shadow mode, off the critical path, and records how its clustering compares with the open tab. Does nothing unless the HEADLESS_WORKER binding is present. Bucketed per user. A change lands within about a minute',
		},
		ui_v3: {
			type: 'allowlist',
			users: [],
			allowEveryone: false,
			description:
				'The tldraw.com v3 redesign, and the design switches (beaker menu) for trying ideas within it. The list starts empty, so nobody sees it until they are added. Read once per page load, so a change reaches a user on their next reload',
		},
	}
}

export { FEATURE_FLAG_KEYS } from '@tldraw/dotcom-shared'

/**
 * FNV-1a hash producing a deterministic bucket 0–99.
 * Hashes userId + flagName so a user gets independent buckets per flag.
 * https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function#FNV-1a_hash
 */
export function hashToPercentage(userId: string, flagName: string): number {
	const input = userId + flagName
	let hash = 2166136261
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i)
		hash = Math.imul(hash, 16777619)
	}
	return (hash >>> 0) % 100
}

// Per-isolate cache of stored values. Every page load fetches all flags and every MCP request
// checks one, so without it each costs a KV read per flag. A flip lands within this TTL plus KV's
// own edge cache (~60s).
const FLAG_CACHE_TTL_MS = 30_000
const flagCache = new Map<FeatureFlagKey, { value: FeatureFlagValue; readAt: number }>()

export function resetFeatureFlagCacheForTests() {
	flagCache.clear()
}

/**
 * The stored value, skipping the isolate cache (KV's own edge cache still applies). Throws when
 * KV does; a stored value that doesn't parse reads as the defaults instead, so the admin panel
 * can still overwrite it.
 */
async function readFeatureFlag(env: Environment, flag: FeatureFlagKey): Promise<FeatureFlagValue> {
	const defaults = getFlagDefaults()[flag]
	const value = await env.FEATURE_FLAGS.get(flag)
	if (!value) return defaults
	let stored: unknown
	try {
		stored = JSON.parse(value)
	} catch (e) {
		console.error(`Stored feature flag ${flag} is not valid JSON:`, e)
		return defaults
	}
	// The defaults table is the schema; KV holds only state. A stored `type` is therefore discarded
	// rather than spread over the default one: `{"type":"allowList"}` — a capital L, or any other
	// typo — would otherwise reach `evaluateFlagForUser` as a shape none of its arms recognise, and
	// the value it lands on decides who is let in.
	//
	// `description` is discarded on the same grounds. A save writes the whole value back, so the
	// text a flag was first saved with otherwise outlives every later edit to this table — the
	// panel goes on describing a control by a name the code no longer uses.
	return {
		...defaults,
		...(stored as object),
		type: defaults.type,
		description: defaults.description,
	} as FeatureFlagValue
}

/**
 * A flag's stored value, cached per isolate. Never throws: when KV fails it serves the last value
 * this isolate read, however old, or the defaults if there is none.
 */
export async function getFeatureFlagValue(
	env: Environment,
	flag: FeatureFlagKey
): Promise<FeatureFlagValue> {
	const cached = flagCache.get(flag)
	if (cached && Date.now() - cached.readAt < FLAG_CACHE_TTL_MS) return cached.value
	try {
		const value = await readFeatureFlag(env, flag)
		flagCache.set(flag, { value, readAt: Date.now() })
		return value
	} catch (e) {
		console.error(`Failed to read feature flag ${flag}:`, e)
		return cached ? cached.value : getFlagDefaults()[flag]
	}
}

/**
 * The type a flag is. Read from the defaults table rather than from KV, which is what makes it a
 * schema: a caller can tell which fields apply to a flag without a KV round trip, and without a
 * stored value getting a say in the answer.
 */
export function getFeatureFlagType(
	env: Environment,
	flag: FeatureFlagKey
): FeatureFlagValue['type'] {
	return getFlagDefaults()[flag].type
}

/**
 * Evaluate a flag for a specific user. Percentage flags use a deterministic
 * hash of userId+flagName. Allowlist flags check the user against the named ids.
 * Boolean flags use the `enabled` field directly.
 */
export function evaluateFlagForUser(
	flag: FeatureFlagValue,
	flagName: string,
	userId: string | null
): boolean {
	// Switched exhaustively rather than ending in a fall-through, so a fourth flag type is a compile
	// error here instead of a flag that quietly evaluates true for everyone. The type itself can only
	// be one the defaults table names — see readFeatureFlag.
	switch (flag.type) {
		case 'boolean':
			// `enabled` is the whole evaluation.
			return flag.enabled
		case 'percentage':
			if (!flag.enabled) return false
			if (!userId) return false
			return hashToPercentage(userId, flagName) < flag.percentage
		case 'allowlist':
			// No master toggle to check: an allowlist says who is on, and an empty one is the off state.
			// A stored `enabled` from before that was true is therefore ignored rather than obeyed.
			// An anonymous caller is never on a list of users. Stated rather than left to `some`, which
			// would also be false but only by accident of `null` matching nobody.
			if (!userId) return false
			// Checked before the list rather than folded into it, so an operator can open a flag to
			// everyone without first emptying a list they will want back when they close it again.
			if (flag.allowEveryone === true) return true
			// Missing or malformed `users` denies rather than admits: this is read from KV, where a
			// hand-edited value can arrive as anything, and the failure mode of the alternative is a flag
			// that silently opens to everyone.
			return (
				Array.isArray(flag.users) && flag.users.some((entry) => entry && entry.userId === userId)
			)
		default:
			exhaustiveSwitchError(flag)
	}
}

/**
 * A change to one flag, discriminated by the type of flag it applies to.
 *
 * Discriminated rather than an optional-field bag, because the fields are not interchangeable: a bag
 * of `{ enabled?, percentage?, users? }` is matched by independent `if` guards that silently drop a
 * field belonging to another type — a `users` list sent for a percentage flag wrote nothing and still
 * reported success. Here a mismatch is a compile error at the call site, and a fourth flag type makes
 * the compiler name every place that has to learn about it.
 */
export type FeatureFlagUpdate =
	| { type: 'boolean'; enabled?: boolean }
	| { type: 'percentage'; enabled?: boolean; percentage?: number }
	| { type: 'allowlist'; users?: AllowlistEntry[]; allowEveryone?: boolean }

/** Thrown when an update names a different type than the flag it addresses. */
export class FeatureFlagTypeError extends Error {}

function expectFlagType<T extends FeatureFlagValue['type']>(
	flag: FeatureFlagKey,
	current: FeatureFlagValue,
	type: T
): Extract<FeatureFlagValue, { type: T }> {
	if (current.type !== type) {
		throw new FeatureFlagTypeError(
			`"${flag}" is a ${current.type} flag; ${type} fields do not apply to it`
		)
	}
	return current as Extract<FeatureFlagValue, { type: T }>
}

/**
 * Set feature flag value in KV store. Admin only.
 */
export async function setFeatureFlag(
	env: Environment,
	flag: FeatureFlagKey,
	update: FeatureFlagUpdate
): Promise<void> {
	// Skips the isolate cache: a cached `current` could be up to a TTL old, and the save would write
	// that back over a newer edit.
	const current = await readFeatureFlag(env, flag)
	const put = async (value: FeatureFlagValue) => {
		await env.FEATURE_FLAGS.put(flag, JSON.stringify(value))
		flagCache.set(flag, { value, readAt: Date.now() })
	}

	switch (update.type) {
		case 'boolean': {
			const value = expectFlagType(flag, current, 'boolean')
			return put({ ...value, enabled: update.enabled ?? value.enabled })
		}
		case 'percentage': {
			const value = expectFlagType(flag, current, 'percentage')
			return put({
				...value,
				enabled: update.enabled ?? value.enabled,
				percentage: update.percentage ?? value.percentage,
			})
		}
		case 'allowlist': {
			const value = expectFlagType(flag, current, 'allowlist')
			return put({
				...value,
				// Replaces the list rather than merging into it, so removing someone is a normal save and
				// not a separate operation the admin UI would have to model.
				users: update.users ?? value.users,
				allowEveryone: update.allowEveryone ?? value.allowEveryone ?? false,
			})
		}
		default:
			exhaustiveSwitchError(update)
	}
}

export { parseAllowlistEmails } from '@tldraw/dotcom-shared'

/**
 * Route handler: Get all feature flags evaluated for the requesting user.
 * Returns only `{ enabled }` per flag — no server internals like percentage.
 */
export async function getFeatureFlags(request: IRequest, env: Environment): Promise<Response> {
	const auth = await getAuth(request, env)
	const userId = auth?.userId ?? null

	const flags: Record<string, EvaluatedFeatureFlag> = {}

	await Promise.all(
		FEATURE_FLAG_KEYS.map(async (key) => {
			const raw = await getFeatureFlagValue(env, key)
			flags[key] = {
				enabled: evaluateFlagForUser(raw, key, userId),
			}
		})
	)

	// Legacy client compat: bundles built before the polyfill removal still read
	// these flags to choose a sync path. Force them onto Zero. Remove once stale
	// bundles have aged out.
	flags.zero_enabled = { enabled: true }
	flags.zero_kill_switch = { enabled: false }
	// Same for commenting_enabled: bundles from before the flag was removed gate every comments
	// surface on it, and a missing key reads as off.
	flags.commenting_enabled = { enabled: true }

	return new Response(JSON.stringify(flags), {
		headers: {
			'Content-Type': 'application/json',
			'x-authenticated': userId ? '1' : '0',
		},
	})
}

/**
 * Every flag's stored value, unevaluated — the admin view. Does NOT evaluate per-user: the stored
 * percentage, enabled and user list are returned as-is.
 *
 * Returns the record rather than a Response so the admin route can decorate it before answering —
 * see the allowlist label resolution there, which needs Postgres and has no business in here.
 * Bypasses the cache: another isolate's copy can be a TTL behind a save.
 */
export async function getAllFeatureFlagValues(
	env: Environment
): Promise<Record<string, FeatureFlagValue>> {
	const flags: Record<string, FeatureFlagValue> = {}

	await Promise.all(
		FEATURE_FLAG_KEYS.map(async (key) => {
			// headless_shadow only does anything where HEADLESS_WORKER is bound (staging today). A flag
			// that cannot act is a control that misleads, so it is hidden from the admin panel until the
			// binding exists in this environment, and reappears the moment the worker is bound there.
			// See headlessShadow.ts.
			if (key === 'headless_shadow' && !env.HEADLESS_WORKER) return
			flags[key] = await readFeatureFlag(env, key)
		})
	)

	return flags
}
