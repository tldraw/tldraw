import { useValue } from '@tldraw/state-react'
import { LicenseManager, LicenseState } from './LicenseManager'

/** @internal */
export function useLicenseManagerState(licenseManager: LicenseManager): LicenseState {
	return useValue('watermarkState', () => licenseManager.state.get(), [licenseManager])
}
