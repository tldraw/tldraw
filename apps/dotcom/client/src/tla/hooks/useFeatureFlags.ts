import { useValue } from 'tldraw'
import { featureFlagsAtom } from '../utils/FeatureFlagsFetcher'

/**
 * Hook that returns the current feature flags from the global atom.
 * Flags are fetched and polled by FeatureFlagsFetcher.
 */
export function useFeatureFlags() {
	const flags = useValue('feature-flags', () => featureFlagsAtom.get(), [])
	return { flags }
}
