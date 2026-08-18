import { useValue } from '@tldraw/state-react'
import { LicenseFeatureName, LicenseManager, LicenseState } from './LicenseManager'

/** @internal */
export function useLicenseManagerState(licenseManager: LicenseManager): LicenseState {
	return useValue('watermarkState', () => licenseManager.state.get(), [licenseManager])
}

/**
 * Reactively reads whether a licensable feature is enabled for the current license. Re-renders when
 * license validation resolves. Returns `false` when there is no license manager, so gated UI stays
 * hidden when mounted without an editor or license context.
 *
 * @internal
 */
export function useLicenseFeatureFlag(
	licenseManager: LicenseManager | null,
	feature: LicenseFeatureName
): boolean {
	return useValue(
		'licenseFeature',
		() => (licenseManager ? licenseManager.isFeatureEnabled(feature) : false),
		[licenseManager, feature]
	)
}
