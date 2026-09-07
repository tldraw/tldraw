import { Environment } from './types'
import { hashToPercentage } from './utils/featureFlags'

const MODES = ['off', 'dual', 'chain'] as const

export type VersionChainMode = (typeof MODES)[number]

/**
 * How versions get written: `off` legacy full copies only, `dual` both (the bake, where
 * reconstructions can be checked against the full copy), `chain` chains only — plus the percentage
 * of rooms (bucketed by room key) it applies to.
 */
export interface VersionChainRollout {
	mode: VersionChainMode
	percent: number
}

/**
 * KV override for the rollout, so the mode can be flipped without a deploy:
 * `wrangler kv key put version_chain_mode '{"mode":"dual","percent":10}'` against the
 * FEATURE_FLAGS namespace. Not one of the FEATURE_FLAG_KEYS: those evaluate per user, and this is
 * per room.
 */
export const VERSION_CHAIN_MODE_KV_KEY = 'version_chain_mode'

function envRollout(env: Environment): VersionChainRollout {
	const mode = env.VERSION_CHAIN_MODE as VersionChainMode | undefined
	if (!mode || !MODES.includes(mode)) return { mode: 'off', percent: 0 }
	const raw = env.VERSION_CHAIN_ROLLOUT_PERCENT
	const percent = raw === undefined ? 100 : Number(raw)
	if (!Number.isFinite(percent)) return { mode: 'off', percent: 0 }
	return { mode, percent }
}

/**
 * The rollout in effect: the KV override when set and well-formed, the env vars otherwise. One KV
 * read — callers cache it for the durable object's lifetime, so a flip lands as objects wake
 * rather than instantly, and the read never sits on the persist path.
 */
export async function loadVersionChainRollout(env: Environment): Promise<VersionChainRollout> {
	const fallback = envRollout(env)
	try {
		const raw = await env.FEATURE_FLAGS.get(VERSION_CHAIN_MODE_KV_KEY)
		if (!raw) return fallback
		const parsed = JSON.parse(raw) as Partial<VersionChainRollout>
		// A malformed override falls back to the env vars whole rather than half-applying: the
		// deployed config is a known state, and a typo silently flipping the bake is the failure
		// this guards.
		if (!parsed.mode || !MODES.includes(parsed.mode)) return fallback
		const percent = parsed.percent === undefined ? 100 : parsed.percent
		if (typeof percent !== 'number' || !Number.isFinite(percent)) return fallback
		return { mode: parsed.mode, percent }
	} catch (e) {
		console.error('Failed to read the version chain rollout override:', e)
		return fallback
	}
}

export function resolveVersionChainMode(
	rollout: VersionChainRollout,
	roomKey: string
): VersionChainMode {
	if (rollout.mode === 'off' || rollout.percent <= 0) return 'off'
	if (rollout.percent >= 100) return rollout.mode

	// Same bucketing function as the KV feature flags, keyed by room instead of user.
	return hashToPercentage(roomKey, '') < rollout.percent ? rollout.mode : 'off'
}
