import { Environment } from './types'
import { hashToPercentage } from './utils/featureFlags'

export type VersionChainMode = 'off' | 'dual' | 'chain'

const MODES: VersionChainMode[] = ['off', 'dual', 'chain']

/**
 * How this room's versions get written: `off` legacy full copies only, `dual` both (the bake, where
 * reconstructions can be checked against the full copy), `chain` chains only.
 *
 * Rollout is a per-environment var and a hash of the room key rather than the KV feature flags:
 * those evaluate per user, and persist has no user and cannot afford a KV read per write.
 */
export function getVersionChainMode(env: Environment, roomKey: string): VersionChainMode {
	const mode = env.VERSION_CHAIN_MODE as VersionChainMode | undefined
	if (!mode || !MODES.includes(mode) || mode === 'off') return 'off'

	const raw = env.VERSION_CHAIN_ROLLOUT_PERCENT
	const percent = raw === undefined ? 100 : Number(raw)
	if (!Number.isFinite(percent) || percent <= 0) return 'off'
	if (percent >= 100) return mode

	// Same bucketing function as the KV feature flags, keyed by room instead of user.
	return hashToPercentage(roomKey, '') < percent ? mode : 'off'
}
