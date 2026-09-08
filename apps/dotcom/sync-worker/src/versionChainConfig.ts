import { FeatureFlagValue } from '@tldraw/dotcom-shared'
import { Environment } from './types'
import { evaluateFlagForUser, getFeatureFlagValue } from './utils/featureFlags'

const MODES = ['off', 'dual', 'chain'] as const

/**
 * How versions get written: `off` legacy full copies only, `dual` both (the bake, where
 * reconstructions can be checked against the full copy), `chain` chains only.
 */
export type VersionChainMode = (typeof MODES)[number]

/**
 * The two flags the mode is derived from: `version_chain` (percentage, bucketed per room) decides
 * whether a room is on chains at all, `version_chain_legacy_writes` (boolean) whether such a room
 * also keeps writing legacy copies.
 */
export interface VersionChainRollout {
	chain: FeatureFlagValue
	legacyWrites: FeatureFlagValue
}

/**
 * The rollout in effect, from the feature flag KV (admin panel), falling back to the per-env
 * defaults. Two KV reads — callers cache the result for the durable object's lifetime, so a flip
 * lands as objects wake rather than instantly, and the reads never sit on the persist path.
 */
export async function loadVersionChainRollout(env: Environment): Promise<VersionChainRollout> {
	const [chain, legacyWrites] = await Promise.all([
		getFeatureFlagValue(env, 'version_chain'),
		getFeatureFlagValue(env, 'version_chain_legacy_writes'),
	])
	return { chain, legacyWrites }
}

export function resolveVersionChainMode(
	rollout: VersionChainRollout,
	roomKey: string
): VersionChainMode {
	// The room key rides in the userId parameter: same deterministic bucketing, keyed per room
	// because a persist has no user.
	if (!evaluateFlagForUser(rollout.chain, 'version_chain', roomKey)) return 'off'
	// The legacy flag is subordinate: a room outside the chain rollout writes legacy no matter what
	// it says, so no combination of flag states leaves a room writing no versions at all. Disabling
	// it is only meaningful once the chain flag covers the rooms it should protect.
	return evaluateFlagForUser(rollout.legacyWrites, 'version_chain_legacy_writes', roomKey)
		? 'dual'
		: 'chain'
}
