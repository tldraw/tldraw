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
	licenseKey = getLicenseKeyFromEnv() ?? undefined,
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

// Renders as a hidden div that can be detected by tests
function LicenseGate() {
	return <div data-testid="tl-license-expired" style={{ display: 'none' }} />
}

let envLicenseKey: string | undefined | null = undefined
function getLicenseKeyFromEnv() {
	if (envLicenseKey !== undefined) {
		return envLicenseKey
	}
	// it's important here that we write out the full process.env.WHATEVER expression instead of
	// doing something like process.env[someVariable]. This is because most bundlers do something
	// like a find-replace inject environment variables, and so won't pick up on dynamic ones. It
	// also means we can't do checks like `process.env && process.env.WHATEVER`, which is why we use
	// the `getEnv` try/catch approach.

	// framework-specific prefixes borrowed from the ones vercel uses, but trimmed down to just the
	// react-y ones: https://vercel.com/docs/environment-variables/framework-environment-variables
	envLicenseKey =
		getEnv(() => process.env.TLDRAW_LICENSE_KEY) ||
		getEnv(() => process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY) ||
		getEnv(() => process.env.REACT_APP_TLDRAW_LICENSE_KEY) ||
		getEnv(() => process.env.GATSBY_TLDRAW_LICENSE_KEY) ||
		getEnv(() => process.env.VITE_TLDRAW_LICENSE_KEY) ||
		getEnv(() => process.env.PUBLIC_TLDRAW_LICENSE_KEY) ||
		getEnv(() => (import.meta as any).env.TLDRAW_LICENSE_KEY) ||
		getEnv(() => (import.meta as any).env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY) ||
		getEnv(() => (import.meta as any).env.REACT_APP_TLDRAW_LICENSE_KEY) ||
		getEnv(() => (import.meta as any).env.GATSBY_TLDRAW_LICENSE_KEY) ||
		getEnv(() => (import.meta as any).env.VITE_TLDRAW_LICENSE_KEY) ||
		getEnv(() => (import.meta as any).env.PUBLIC_TLDRAW_LICENSE_KEY) ||
		null

	return envLicenseKey
}

function getEnv(cb: () => string | undefined) {
	try {
		return cb()
	} catch {
		return undefined
	}
}
