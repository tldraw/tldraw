import { useState } from 'react'
import { getCurrentFlags } from '../tla/utils/FeatureFlagPoller'

/**
 * Returns the A/B test group for canvas indicators.
 * - 'canvas': treatment group — uses 2D canvas indicator rendering
 * - 'svg': control group — falls back to legacy SVG indicator rendering
 *
 * The value is resolved once at mount time and stays stable for the session.
 */
export function useCanvasIndicatorsAb(): 'canvas' | 'svg' {
	const [group] = useState<'canvas' | 'svg'>(() => {
		// fetchFeatureFlags() is eagerly started on module load, so by the time
		// the editor mounts the flags are usually already resolved.
		return getCurrentFlags().canvas_indicators_ab?.enabled ? 'canvas' : 'svg'
	})

	return group
}
