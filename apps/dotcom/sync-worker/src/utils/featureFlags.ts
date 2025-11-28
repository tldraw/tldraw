import { IRequest } from 'itty-router'
import { Environment } from '../types'

export type FeatureFlagKey = 'fairies_enabled' | 'fairies_purchase_enabled'

const ALL_FLAGS: FeatureFlagKey[] = ['fairies_enabled', 'fairies_purchase_enabled']

/**
 * Get feature flag value from KV store
 * @returns true if enabled, false if disabled or not found (safe default)
 */
export async function getFeatureFlag(env: Environment, flag: FeatureFlagKey): Promise<boolean> {
	try {
		const value = await env.FEATURE_FLAGS.get(flag)
		return value === 'true'
	} catch (e) {
		console.error(`Failed to get feature flag ${flag}:`, e)
		return false // Safe default: disabled
	}
}

/**
 * Set feature flag value in KV store
 * Admin only - use via admin routes
 */
export async function setFeatureFlag(
	env: Environment,
	flag: FeatureFlagKey,
	enabled: boolean
): Promise<void> {
	await env.FEATURE_FLAGS.put(flag, enabled ? 'true' : 'false')
}

/**
 * Check if user has fairy access (flag + existing checks)
 */
export async function checkFairyAccess(
	env: Environment,
	fairyLimit: number | null,
	fairyAccessExpiresAt: number | null
): Promise<boolean> {
	const flagEnabled = await getFeatureFlag(env, 'fairies_enabled')
	if (!flagEnabled) return false

	const hasValidLimit = fairyLimit !== null && fairyLimit > 0
	const notExpired = fairyAccessExpiresAt !== null && fairyAccessExpiresAt > Date.now()

	return hasValidLimit && notExpired
}

/**
 * Route handler: Get all feature flags
 */
export async function getFeatureFlags(_request: IRequest, env: Environment): Promise<Response> {
	const flags: Record<string, boolean> = {}

	await Promise.all(
		ALL_FLAGS.map(async (key) => {
			flags[key] = await getFeatureFlag(env, key)
		})
	)

	return new Response(JSON.stringify(flags), { headers: { 'Content-Type': 'application/json' } })
}
