import { useValue } from '@tldraw/state-react'
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useMaybeEditor } from '../hooks/useEditor'
import { LicenseManager } from './LicenseManager'
import {
	disposeSharedLicenseManager,
	getDefaultLicenseKey,
	getSharedLicenseManager,
} from './setLicense'

/** @internal */
export const LicenseContext = createContext<LicenseManager | null>(null)

/** @internal */
export function useLicenseContext(): LicenseManager {
	const licenseManager = useMaybeLicenseManager()
	if (!licenseManager) {
		throw new Error(
			'useLicenseContext must be used inside of the <Tldraw /> or <TldrawEditor /> components, or inside an <EditorProvider /> wrapping an editor created by them'
		)
	}
	return licenseManager
}

/**
 * Returns the license manager for the current editor, or `null` if there is none. Reads the
 * license context when inside `<TldrawEditor />`, and otherwise falls back to the license manager
 * of the nearest editor, so UI mounted outside the editor tree (via `EditorProvider`) resolves the
 * same license as the editor it belongs to.
 *
 * @internal
 */
export function useMaybeLicenseManager(): LicenseManager | null {
	const licenseManager = useContext(LicenseContext)
	const editor = useMaybeEditor()
	// Reactive: resolving through the editor reads the key `setLicense()` sets, and a plain call
	// here would leave gated UI on the old manager while the imperative surfaces moved to the new one.
	return useValue('licenseManager', () => licenseManager ?? editor?.getLicenseManager() ?? null, [
		licenseManager,
		editor,
	])
}

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
	// Falls back reactively, so a `setLicense()` call that lands after mount still reaches the
	// provider rather than leaving React and the imperative surfaces on different licenses.
	const defaultLicenseKey = useValue('defaultLicenseKey', () => getDefaultLicenseKey(), [])
	const resolvedLicenseKey = licenseKey ?? defaultLicenseKey
	// Keyed on the license key: the editor is recreated when the key changes, and must not be
	// handed a manager that validated the old key.
	// Shared rather than owned, so the editor below resolves this very manager instead of minting a
	// second one for the same key and validating it twice.
	const licenseManager = useMemo(
		() => getSharedLicenseManager(resolvedLicenseKey),
		[resolvedLicenseKey]
	)
	const licenseState = useValue(licenseManager.state)
	// The manager whose LICENSE_TIMEOUT elapsed; compared by identity so a new key un-gates the editor.
	const [gatedManager, setGatedManager] = useState<LicenseManager | null>(null)
	const showEditor = gatedManager !== licenseManager

	// Dispose only the replaced manager, never on cleanup: strict mode re-runs effects with the
	// same manager, and disposing it there would silence the live one.
	const previousManager = useRef<LicenseManager | null>(null)
	useEffect(() => {
		if (previousManager.current && previousManager.current !== licenseManager) {
			disposeSharedLicenseManager(previousManager.current)
		}
		previousManager.current = licenseManager
	}, [licenseManager])

	// When license expires or no license in production, show for 5 seconds then hide
	useEffect(() => {
		if (shouldHideEditorAfterDelay(licenseState) && showEditor) {
			// eslint-disable-next-line no-restricted-globals
			const timer = setTimeout(() => {
				setGatedManager(licenseManager)
			}, LICENSE_TIMEOUT)

			return () => clearTimeout(timer)
		}
	}, [licenseManager, licenseState, showEditor])

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
