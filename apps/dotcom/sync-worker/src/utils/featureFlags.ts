import { FeatureFlagKey, FeatureFlagValue, hasActiveFairyAccess } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'

const FLAG_DEFAULTS: Record<FeatureFlagKey, FeatureFlagValue> = {
	fairies_enabled: {
		enabled: false,
		description: 'When OFF: completely disables all fairy features for everyone',
	},
	fairies_purchase_enabled: {
		enabled: false,
		description:
			'When OFF: completely disables purchasing for everyone (hides purchase button & blocks webhooks)',
	},
}

const ALL_FLAGS: FeatureFlagKey[] = ['fairies_enabled', 'fairies_purchase_enabled']

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
			// Return default if not found
			return FLAG_DEFAULTS[flag]
		}
		return JSON.parse(value)
	} catch (e) {
		console.error(`Failed to get feature flag ${flag}:`, e)
		return FLAG_DEFAULTS[flag]
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
 * Check if user has fairy access (flag + existing checks)
 */
export async function checkFairyAccess(
	env: Environment,
	fairyLimit: number | null,
	fairyAccessExpiresAt: number | null
): Promise<boolean> {
	const flagEnabled = await getFeatureFlag(env, 'fairies_enabled')
	if (!flagEnabled) return false

	return hasActiveFairyAccess(fairyAccessExpiresAt, fairyLimit)
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

/**
 * Route handler: Get feature flags as booleans only (for public API)
 */
export async function getFeatureFlagsBooleans(
	_request: IRequest,
	env: Environment
): Promise<Response> {
	const flags: Record<string, boolean> = {}

	await Promise.all(
		ALL_FLAGS.map(async (key) => {
			flags[key] = await getFeatureFlag(env, key)
		})
	)

	return new Response(JSON.stringify(flags), { headers: { 'Content-Type': 'application/json' } })
}
