import { useValue } from '@tldraw/state-react'
import { LicenseManager } from './LicenseManager'

/** @internal */
export function useLicenseManagerState(licenseManager: LicenseManager) {
	return useValue('watermarkState', () => licenseManager.state.get(), [licenseManager])
}
