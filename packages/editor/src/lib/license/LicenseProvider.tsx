import { useValue } from '@tldraw/state-react'
import { createContext, ReactNode, useContext, useState } from 'react'
import { LicenseManager } from './LicenseManager'

/** @internal */
export const LicenseContext = createContext({} as LicenseManager)

/** @internal */
export const useLicenseContext = () => useContext(LicenseContext)

/** @internal */
export function LicenseProvider({
	licenseKey,
	children,
}: {
	licenseKey?: string
	children: ReactNode
}) {
	const [licenseManager] = useState(() => new LicenseManager(licenseKey))
	return <LicenseContext.Provider value={licenseManager}>{children}</LicenseContext.Provider>
}

/** @internal */
export function useLicenseManagerState(licenseManager: LicenseManager) {
	return useValue('watermarkState', () => licenseManager.state.get(), [licenseManager])
}
