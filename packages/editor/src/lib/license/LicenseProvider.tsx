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
	const licenseState = useValue(licenseManager.state)

	// If internal license has expired, don't render the editor at all
	if (licenseState === 'internal-expired') {
		return <div data-testid="tl-license-expired" style={{ display: 'none' }} />
	}

	return <LicenseContext.Provider value={licenseManager}>{children}</LicenseContext.Provider>
}
