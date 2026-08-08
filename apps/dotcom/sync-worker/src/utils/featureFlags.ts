import {
	AllowlistEntry,
	EvaluatedFeatureFlag,
	FEATURE_FLAG_KEYS,
	FeatureFlagKey,
	FeatureFlagValue,
} from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { getAuth } from './tla/getAuth'

function getFlagDefaults(_env: Environment): Record<FeatureFlagKey, FeatureFlagValue> {
	return {
		rum_enabled: {
			type: 'percentage',
			percentage: 0,
			enabled: false,
			description: 'Real User Monitoring for editor performance metrics',
		},
		commenting_enabled: {
			type: 'percentage',
			percentage: 0,
			enabled: false,
			description:
				'Commenting on files (tool, pins, threads, sidebar, notifications). Users with a @tldraw.com email always have it, regardless of this flag',
		},
		mcp_server_access: {
			type: 'allowlist',
			users: [],
			enabled: false,
			description:
				'Access to the board screenshot MCP server at /api/app/mcp. Off by default: the endpoint requires auth, so an unset flag denies everyone rather than leaving it open',
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
	try {
		const value = await env.FEATURE_FLAGS.get(flag)
		if (!value) {
			return getFlagDefaults(env)[flag]
		}
		return { ...getFlagDefaults(env)[flag], ...JSON.parse(value) }
	} catch (e) {
		console.error(`Failed to get feature flag ${flag}:`, e)
		return getFlagDefaults(env)[flag]
	}
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
	if (flag.type === 'percentage') {
		if (!userId) return false
		return hashToPercentage(userId, flagName) < flag.percentage
	}
	if (flag.type === 'allowlist') {
		// An anonymous caller is never on a list of users. Stated rather than left to `some`, which
		// would also be false but only by accident of `null` matching nobody.
		if (!userId) return false
		// Missing or malformed `users` denies rather than admits: this is read from KV, where a
		// hand-edited value can arrive as anything, and the failure mode of the alternative is a flag
		// that silently opens to everyone.
		return Array.isArray(flag.users) && flag.users.some((entry) => entry && entry.userId === userId)
	}
	return true
}

/**
 * Get the master enabled switch for a flag. For boolean flags this is the full
 * evaluation. For percentage flags this ignores the per-user rollout — use
 * `getFeatureFlags` (the route handler) for per-user evaluation instead.
 */
export async function getFeatureFlagEnabled(
	env: Environment,
	flag: FeatureFlagKey
): Promise<boolean> {
	const value = await getFeatureFlagValue(env, flag)
	return value.enabled
}

/**
 * Whether a flag is on for one user, server-side. The counterpart to `getFeatureFlags` (which
 * evaluates every flag for a browser) for a route that gates itself on a single one.
 */
export async function isFeatureFlagEnabledForUser(
	env: Environment,
	flag: FeatureFlagKey,
	userId: string
): Promise<boolean> {
	return evaluateFlagForUser(await getFeatureFlagValue(env, flag), flag, userId)
}

/**
 * Set feature flag value in KV store. Admin only.
 */
export async function setFeatureFlag(
	env: Environment,
	flag: FeatureFlagKey,
	value: { enabled?: boolean; percentage?: number; users?: AllowlistEntry[] }
): Promise<void> {
	const current = await getFeatureFlagValue(env, flag)
	if (value.enabled !== undefined) {
		current.enabled = value.enabled
	}
	if (value.percentage !== undefined && current.type === 'percentage') {
		current.percentage = value.percentage
	}
	// Replaces the list rather than merging into it, so removing someone is a normal save and not a
	// separate operation the admin UI would have to model.
	if (value.users !== undefined && current.type === 'allowlist') {
		current.users = value.users
	}
	await env.FEATURE_FLAGS.put(flag, JSON.stringify(current))
}

/**
 * Parses admin input into the emails an allowlist save should resolve: one per line or comma, blanks
 * and duplicates dropped, lowercased so the lookup and the dedupe agree. Anything that isn't an email
 * address is rejected rather than sent to the lookup, so the admin gets "that isn't an email" instead
 * of the blanker "no account for that".
 */
export function parseAllowlistEmails(input: unknown): string[] {
	const raw = Array.isArray(input)
		? input.map((entry) => String(entry))
		: String(input ?? '').split(/[\n,]/)

	const emails: string[] = []
	for (const value of raw) {
		const email = value.trim().toLowerCase()
		if (!email) continue
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
			throw new Error(`"${value.trim()}" is not an email address`)
		}
		if (!emails.includes(email)) emails.push(email)
	}
	return emails
}

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
 * Route handler: Get all feature flags with raw values (for admin UI).
 * Does NOT evaluate per-user — returns the stored percentage and enabled as-is.
 */
export async function getFeatureFlagsAdmin(
	_request: IRequest,
	env: Environment
): Promise<Response> {
	const flags: Record<string, FeatureFlagValue> = {}

	await Promise.all(
		FEATURE_FLAG_KEYS.map(async (key) => {
			flags[key] = await getFeatureFlagValue(env, key)
		})
	)

	return new Response(JSON.stringify(flags), { headers: { 'Content-Type': 'application/json' } })
}
