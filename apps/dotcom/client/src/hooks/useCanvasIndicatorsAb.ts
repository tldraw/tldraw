import { useEffect, useState } from 'react'
import {
	fetchFeatureFlags,
	getCurrentFlags,
	hasResolvedFlagsOnce,
} from '../tla/utils/FeatureFlagPoller'

// Hard upper bound on how long we'll wait for the feature flag fetch before
// falling back to the control (svg) group. This keeps the editor from being
// blocked indefinitely if the flags endpoint is slow or unavailable.
const FLAG_RESOLUTION_TIMEOUT_MS = 500

/**
 * Returns the A/B test group for canvas indicators.
 * - 'canvas': treatment group — uses 2D canvas indicator rendering
 * - 'svg': control group — falls back to legacy SVG indicator rendering
 * - `null`: flags haven't resolved yet. Callers should avoid mounting the
 *   editor while this is `null` to prevent misbucketing the user into the
 *   control group just because the fetch hasn't landed.
 *
 * The value is resolved once at mount time and stays stable for the session.
 * If the flag fetch takes longer than {@link FLAG_RESOLUTION_TIMEOUT_MS} we
 * fall back to `'svg'` so the editor isn't blocked on the network.
 */
export function useCanvasIndicatorsAb(): 'canvas' | 'svg' | null {
	const [group, setGroup] = useState<'canvas' | 'svg' | null>(() => {
		// Fast path — if the eager `fetchFeatureFlags()` call on module load
		// has already settled, read synchronously and skip the async wait.
		if (hasResolvedFlagsOnce()) {
			return getCurrentFlags().canvas_indicators_ab?.enabled ? 'canvas' : 'svg'
		}
		return null
	})

	useEffect(() => {
		if (group !== null) return

		let settled = false
		const timeout = setTimeout(() => {
			if (settled) return
			settled = true
			setGroup('svg')
		}, FLAG_RESOLUTION_TIMEOUT_MS)

		fetchFeatureFlags().then((flags) => {
			if (settled) return
			settled = true
			clearTimeout(timeout)
			setGroup(flags.canvas_indicators_ab?.enabled ? 'canvas' : 'svg')
		})

		return () => {
			settled = true
			clearTimeout(timeout)
		}
	}, [group])

	return group
}
