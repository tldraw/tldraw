import { EvaluatedFeatureFlag, FeatureFlagKey, FeatureFlagValue } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { getAuth } from './tla/getAuth'

function getFlagDefaults(env: Environment): Record<FeatureFlagKey, FeatureFlagValue> {
	// Default to enabled in dev/preview when no KV value exists
	const defaultEnabled = env.TLDRAW_ENV === 'development'

	return {
		sqlite_file_storage: {
			type: 'boolean',
			enabled: defaultEnabled,
			description: 'When ON: uses SQLite storage for TLFileDurableObject instead of in-memory',
		},
		proper_zero: {
			type: 'percentage',
			percentage: 0,
			enabled: false,
			description: 'When ON: uses proper Zero client instead of ZeroPolyfill',
		},
	}
}

export const ALL_FLAGS: FeatureFlagKey[] = ['sqlite_file_storage', 'proper_zero']

/**
 * FNV-1a hash producing a deterministic bucket 0–99.
 * Hashes userId + flagName so a user gets independent buckets per flag.
 * https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function#FNV-1a_hash
 */
function hashToPercentage(userId: string, flagName: string): number {
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
		return JSON.parse(value)
	} catch (e) {
		console.error(`Failed to get feature flag ${flag}:`, e)
		return getFlagDefaults(env)[flag]
	}
}

/**
 * Evaluate a flag for a specific user. Percentage flags use a deterministic
 * hash of userId+flagName. Boolean flags use the `enabled` field directly.
 */
function evaluateFlagForUser(
	flag: FeatureFlagValue,
	flagName: string,
	userId: string | null
): boolean {
	if (!flag.enabled) return false
	if (flag.type === 'percentage') {
		if (!userId) return false
		return hashToPercentage(userId, flagName) < flag.percentage
	}
	return true
}

/**
 * Get feature flag enabled status
 */
export async function getFeatureFlag(env: Environment, flag: FeatureFlagKey): Promise<boolean> {
	const value = await getFeatureFlagValue(env, flag)
	return value.enabled
}

/**
 * Set feature flag value in KV store. Admin only.
 */
export async function setFeatureFlag(
	env: Environment,
	flag: FeatureFlagKey,
	value: { enabled?: boolean; percentage?: number }
): Promise<void> {
	const current = await getFeatureFlagValue(env, flag)
	const updated: FeatureFlagValue = { ...current, ...value }
	await env.FEATURE_FLAGS.put(flag, JSON.stringify(updated))
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
		ALL_FLAGS.map(async (key) => {
			const raw = await getFeatureFlagValue(env, key)
			flags[key] = {
				enabled: evaluateFlagForUser(raw, key, userId),
			}
		})
	)

	return new Response(JSON.stringify(flags), { headers: { 'Content-Type': 'application/json' } })
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
		ALL_FLAGS.map(async (key) => {
			flags[key] = await getFeatureFlagValue(env, key)
		})
	)

	return new Response(JSON.stringify(flags), { headers: { 'Content-Type': 'application/json' } })
}
