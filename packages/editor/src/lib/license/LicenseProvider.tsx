import { useValue } from '@tldraw/state-react'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { LicenseManager } from './LicenseManager'

/** @internal */
export const LicenseContext = createContext({} as LicenseManager)

/** @internal */
export const useLicenseContext = () => useContext(LicenseContext)

function shouldHideEditorAfterDelay(licenseState: string): boolean {
	return licenseState === 'expired' || licenseState === 'unlicensed-production'
}

/** @internal */
export const LICENSE_TIMEOUT = 5000

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
	const [showEditor, setShowEditor] = useState(true)

	// When license expires or no license in production, show for 5 seconds then hide
	useEffect(() => {
		if (shouldHideEditorAfterDelay(licenseState) && showEditor) {
			// eslint-disable-next-line no-restricted-globals
			const timer = setTimeout(() => {
				setShowEditor(false)
			}, LICENSE_TIMEOUT)

			return () => clearTimeout(timer)
		}
	}, [licenseState, showEditor])

	// If license is expired or no license in production and 5 seconds have passed, don't render anything (blank screen)
	if (shouldHideEditorAfterDelay(licenseState) && !showEditor) {
		return <LicenseGate />
	}

	return <LicenseContext.Provider value={licenseManager}>{children}</LicenseContext.Provider>
}

function LicenseGate() {
	return <div data-testid="tl-license-expired" style={{ display: 'none' }} />
}
