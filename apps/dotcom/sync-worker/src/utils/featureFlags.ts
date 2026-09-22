import {
	AllowlistEntry,
	EvaluatedFeatureFlag,
	FEATURE_FLAG_KEYS,
	FeatureFlagKey,
	FeatureFlagValue,
} from '@tldraw/dotcom-shared'
import { exhaustiveSwitchError } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../postgres'
import { Environment } from '../types'
import { getAuth } from './tla/getAuth'

function getFlagDefaults(env: Environment): Record<FeatureFlagKey, FeatureFlagValue> {
	return {
		rum_enabled: {
			type: 'percentage',
			percentage: 0,
			enabled: false,
			description: 'Real User Monitoring for editor performance metrics',
		},
		first_load_rum: {
			type: 'percentage',
			// Master toggle on, 0%: turning it on for a debugging session is one percentage change in
			// the admin panel, no deploy. Users with a @tldraw.com email send it regardless.
			percentage: 0,
			enabled: true,
			description:
				'Send the per-step first_load timing event (client marks + sync server echo) to PostHog. Users with a @tldraw.com email always send it, regardless of this flag',
		},
		commenting_enabled: {
			type: 'percentage',
			percentage: 0,
			enabled: false,
			description:
				'Commenting on files (tool, pins, threads, sidebar, notifications). Users with a @tldraw.com email always have it, regardless of this flag',
		},
		mcp_server_enabled: {
			type: 'boolean',
			// On unless somebody turns it off. A KV read that fails lands on this default, and the
			// failure direction has to be "the server keeps working" — a kill switch that trips on its
			// own storage being unavailable takes the product down for an unrelated fault.
			enabled: true,
			description:
				'MCP server kill switch. Off takes /api/app/mcp down for everyone, allowlist and @tldraw.com included, without a deploy',
		},
		mcp_server_access: {
			type: 'allowlist',
			users: [],
			allowEveryone: false,
			enabled: false,
			description:
				'Who may drive the MCP server at /api/app/mcp. Off by default: the endpoint requires auth, so an unset flag denies everyone rather than leaving it open. Anyone with a verified @tldraw.com email is admitted whatever the list says. Allow everyone opens it to every signed-in account',
		},
		version_chain: {
			type: 'percentage',
			// Non-production environments exercise the new write path by default; production waits for
			// an explicit flip. Replaces the old VERSION_CHAIN_MODE wrangler vars.
			percentage: env.TLDRAW_ENV === 'production' ? 0 : 100,
			enabled: env.TLDRAW_ENV !== 'production',
			description:
				'Version cache entries written as segmented delta chains. Bucketed per ROOM, not per user: the sync worker passes the room R2 key as the id, and the per-user value browsers see is meaningless',
		},
		version_chain_legacy_writes: {
			type: 'boolean',
			enabled: true,
			description:
				'While a room is on version chains, also write legacy full copies (the dual-write bake). Evaluated per ROOM by the sync worker. Only consulted for rooms the version_chain rollout covers — rooms outside it always write legacy',
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

/**
 * Get feature flag value from KV store
 */
export async function getFeatureFlagValue(
	env: Environment,
	flag: FeatureFlagKey
): Promise<FeatureFlagValue> {
	const defaults = getFlagDefaults(env)[flag]
	try {
		const value = await env.FEATURE_FLAGS.get(flag)
		if (!value) {
			return defaults
		}
		// The defaults table is the schema; KV holds only state. A stored `type` is therefore discarded
		// rather than spread over the default one: `{"type":"allowList"}` — a capital L, or any other
		// typo — would otherwise reach `evaluateFlagForUser` as a shape none of its arms recognise, and
		// the value it lands on decides who is let in.
		return { ...defaults, ...JSON.parse(value), type: defaults.type } as FeatureFlagValue
	} catch (e) {
		console.error(`Failed to get feature flag ${flag}:`, e)
		return defaults
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
	return getFlagDefaults(env)[flag].type
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
	if (!flag.enabled) return false
	// Switched exhaustively rather than ending in a fall-through, so a fourth flag type is a compile
	// error here instead of a flag that quietly evaluates true for everyone. The type itself can only
	// be one the defaults table names — see getFeatureFlagValue.
	switch (flag.type) {
		case 'boolean':
			// `enabled` is the whole evaluation, and it was checked above.
			return true
		case 'percentage':
			if (!userId) return false
			return hashToPercentage(userId, flagName) < flag.percentage
		case 'allowlist':
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
 * Whether a flag is on for one user, server-side. The counterpart to `getFeatureFlags` (which
 * evaluates every flag for a browser) for a route that gates itself on a single one.
 */
/**
 * Whether a caller may drive the MCP server: the `mcp_server_access` flag, or a verified
 * @tldraw.com email.
 *
 * The domain check is second on purpose. It needs the account's email, which is a Postgres read the
 * flag evaluation does not otherwise make, so putting it after the flag means anybody already
 * granted pays nothing for it — and the only requests that take the extra read are ones that were
 * about to be refused anyway.
 *
 * Read from our own `user` row rather than Clerk: the address is already replicated here, and a
 * Clerk round trip on every refused request is a worse thing to add to an auth path.
 */
export async function canUseMcpServer(env: Environment, userId: string): Promise<boolean> {
	if (await isFeatureFlagEnabledForUser(env, 'mcp_server_access', userId)) return true
	return await hasTldrawEmail(env, userId)
}

async function hasTldrawEmail(env: Environment, userId: string): Promise<boolean> {
	const db = createPostgresConnectionPool(env, 'sync-worker/hasTldrawEmail')
	try {
		const user = await db
			.selectFrom('user')
			.select('email')
			.where('id', '=', userId)
			.executeTakeFirst()
		// Lowercased because the column stores whatever the account signed up with, and a capitalised
		// domain is the same domain. Denies on a missing row rather than throwing: a token whose user
		// is gone should be refused, not turned into a 500.
		return user?.email?.toLowerCase().endsWith('@tldraw.com') === true
	} catch (e) {
		// An access check that fails open on a database blip would be the wrong direction entirely.
		console.error('Failed to read user email for MCP access:', e)
		return false
	} finally {
		await db.destroy()
	}
}

export async function isFeatureFlagEnabledForUser(
	env: Environment,
	flag: FeatureFlagKey,
	userId: string
): Promise<boolean> {
	return evaluateFlagForUser(await getFeatureFlagValue(env, flag), flag, userId)
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
	| { type: 'allowlist'; enabled?: boolean; users?: AllowlistEntry[]; allowEveryone?: boolean }

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
	const current = await getFeatureFlagValue(env, flag)
	const put = (value: FeatureFlagValue) => env.FEATURE_FLAGS.put(flag, JSON.stringify(value))

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
				enabled: update.enabled ?? value.enabled,
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
 */
export async function getAllFeatureFlagValues(
	env: Environment
): Promise<Record<string, FeatureFlagValue>> {
	const flags: Record<string, FeatureFlagValue> = {}

	await Promise.all(
		FEATURE_FLAG_KEYS.map(async (key) => {
			flags[key] = await getFeatureFlagValue(env, key)
		})
	)

	return flags
}
