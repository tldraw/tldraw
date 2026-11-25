import { createContext, useContext, useEffect, useState } from 'react'
import { useMaybeApp } from '../../hooks/useAppState'
import { getCurrentFlags, getFeatureFlags } from '../../utils/featureFlags'

/** True inside an editor that mounts the signed-out libraries panel. */
export const AnonLibrariesContext = createContext(false)

function useLibrariesAnonymousFlag() {
	const [enabled, setEnabled] = useState(
		() => getCurrentFlags().libraries_anonymous?.enabled ?? false
	)
	useEffect(() => {
		let cancelled = false
		getFeatureFlags().then((flags) => {
			if (!cancelled) setEnabled(flags.libraries_anonymous?.enabled ?? false)
		})
		return () => {
			cancelled = true
		}
	}, [])
	return enabled
}

/**
 * Whether this editor shows a signed-out visitor the read-only libraries: it mounts the panel, no
 * one is signed in, and the `libraries_anonymous` flag is on. The licence is checked separately.
 */
export function useAnonLibrariesOffered() {
	const mounted = useContext(AnonLibrariesContext)
	const app = useMaybeApp()
	const flag = useLibrariesAnonymousFlag()
	return mounted && !app && flag
}
