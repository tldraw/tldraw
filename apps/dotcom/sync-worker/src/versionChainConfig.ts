import { FeatureFlagValue } from '@tldraw/dotcom-shared'
import { Environment } from './types'
import { evaluateFlagForUser, getFeatureFlagValue } from './utils/featureFlags'

/**
 * How versions are encoded in the chain bucket: `chain` writes deltas between keyframes, `off`
 * writes every version as a keyframe. Both write only to the chain bucket; nothing writes the
 * legacy version bucket any more.
 */
export type VersionChainMode = 'off' | 'chain'

/**
 * The `version_chain` flag (percentage, bucketed per room), from the feature flag KV (admin
 * panel), falling back to the per-env default. Callers cache the result for the durable object's
 * lifetime, so a flip lands as objects wake rather than instantly, and the read never sits on the
 * persist path.
 */
export async function loadVersionChainRollout(env: Environment): Promise<FeatureFlagValue> {
	return await getFeatureFlagValue(env, 'version_chain')
}

export function resolveVersionChainMode(
	rollout: FeatureFlagValue,
	roomKey: string
): VersionChainMode {
	// The room key rides in the userId parameter: same deterministic bucketing, keyed per room
	// because a persist has no user.
	return evaluateFlagForUser(rollout, 'version_chain', roomKey) ? 'chain' : 'off'
}
