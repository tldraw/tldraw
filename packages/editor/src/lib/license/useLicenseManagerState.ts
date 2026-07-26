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
	return useValue(
		'licenseFeature',
		() =>
			// `LicenseContext` defaults to an empty object, so components rendered outside a
			// `LicenseProvider` land here with nothing to ask. No provider means no license key, which
			// means no feature: fail closed rather than throwing, so gated components render nothing
			// instead of crashing the tree.
			licenseManager?.isFeatureEnabled?.(feature) ?? false,
		[licenseManager, feature]
	)
}
