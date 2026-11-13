import { useAuth } from '@clerk/react'
import { useCallback } from 'react'
import { signoutAnalytics } from '../../utils/analytics'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../utils/app-ui-events'
import { resetLocalSessionStateButKeepTheme } from '../utils/local-session-state'
import { useMaybeApp } from './useAppState'

export function useSignOut(source: TLAppUiEventSource) {
	const auth = useAuth()
	const app = useMaybeApp()
	const trackEvent = useTldrawAppUiEvents()

	return useCallback(() => {
		signoutAnalytics()
		auth
			.signOut()
			.then(async () => {
				resetLocalSessionStateButKeepTheme()
				// After sign-out rather than before: an IndexedDB delete waits for every connection to
				// the database to close, and other tabs only drop theirs once Clerk propagates sign-out.
				await app?.deleteLocalData()
			})
			.catch((err) => console.error('Sign out failed:', err))
		trackEvent('sign-out-clicked', { source })
	}, [auth, app, trackEvent, source])
}
