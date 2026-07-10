import { useValue } from '@tldraw/state-react'
import { LicenseFeatureName, LicenseManager, LicenseState } from './LicenseManager'

/** @internal */
export function useLicenseManagerState(licenseManager: LicenseManager): LicenseState {
	return useValue('watermarkState', () => licenseManager.state.get(), [licenseManager])
}

/**
 * Reactively reads whether a licensable feature is enabled for the current license. Re-renders when
 * license validation resolves.
 *
 * @internal
 */
export function useLicenseFeatureFlag(
	licenseManager: LicenseManager,
	feature: LicenseFeatureName
): boolean {
	return useValue('licenseFeature', () => licenseManager.isFeatureEnabled(feature), [
		licenseManager,
		feature,
	])
}
