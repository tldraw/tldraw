import { FeatureFlagKey, FeatureFlagValue } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'

function getFlagDefaults(env: Environment): Record<FeatureFlagKey, FeatureFlagValue> {
	// Default to enabled in dev/preview when no KV value exists
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const defaultEnabled = env.TLDRAW_ENV === 'development'

	return {}
}

const ALL_FLAGS: FeatureFlagKey[] = []

/**
 * Get feature flag value from KV store
 * @returns FeatureFlagValue with enabled status and description
 */
export async function getFeatureFlagValue(
	env: Environment,
	flag: FeatureFlagKey
): Promise<FeatureFlagValue> {
	try {
		const value = await env.FEATURE_FLAGS.get(flag)
		if (!value) {
			// Return environment-specific default if not found
			return getFlagDefaults(env)[flag]
		}
		return JSON.parse(value)
	} catch (e) {
		console.error(`Failed to get feature flag ${flag}:`, e)
		return getFlagDefaults(env)[flag]
	}
}

/**
 * Get feature flag enabled status (for backward compatibility)
 * @returns true if enabled, false if disabled or not found (safe default)
 */
export async function getFeatureFlag(env: Environment, flag: FeatureFlagKey): Promise<boolean> {
	const value = await getFeatureFlagValue(env, flag)
	return value.enabled
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
	const current = await getFeatureFlagValue(env, flag)
	const updated: FeatureFlagValue = { ...current, enabled }
	await env.FEATURE_FLAGS.put(flag, JSON.stringify(updated))
}

/**
 * Route handler: Get all feature flags (full objects with descriptions)
 */
export async function getFeatureFlags(_request: IRequest, env: Environment): Promise<Response> {
	const flags: Record<string, FeatureFlagValue> = {}

	await Promise.all(
		ALL_FLAGS.map(async (key) => {
			flags[key] = await getFeatureFlagValue(env, key)
		})
	)

	return new Response(JSON.stringify(flags), { headers: { 'Content-Type': 'application/json' } })
}
