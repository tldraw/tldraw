import { useValue } from '@tldraw/state-react'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
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
	const [showExpired, setShowExpired] = useState(true)

	// When license expires, show for 5 seconds then hide
	useEffect(() => {
		if (licenseState === 'expired' && showExpired) {
			// eslint-disable-next-line no-restricted-globals
			const timer = setTimeout(() => {
				setShowExpired(false)
			}, 5000)

			return () => clearTimeout(timer)
		}
	}, [licenseState, showExpired])

	// If internal license has expired, don't render the editor at all
	if (licenseState === 'internal-expired') {
		return <LicenseGate />
	}

	// If license is expired and 5 seconds have passed, don't render anything (blank screen)
	if (licenseState === 'expired' && !showExpired) {
		return <LicenseGate />
	}

	return <LicenseContext.Provider value={licenseManager}>{children}</LicenseContext.Provider>
}

function LicenseGate() {
	return <div data-testid="tl-license-expired" style={{ display: 'none' }} />
}
