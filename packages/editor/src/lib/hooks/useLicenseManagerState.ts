import { useValue } from '@tldraw/state-react'
import { LicenseManager } from '../license/LicenseManager'

/** @internal */
export function useLicenseManagerState(licenseManager: LicenseManager) {
	return useValue('watermarkState', () => licenseManager.state.get(), [licenseManager])
}
