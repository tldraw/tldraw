import { useAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'
import { useValue } from 'tldraw'
import {
	configureAnalytics,
	setStoredAnalyticsConsent,
	trackEvent,
	useAnalyticsConsentValue,
} from '../../utils/analytics'
import { useMaybeApp } from './useAppState'

/** Consent is null until the user has set a preference. */
export function useAnalyticsConsent() {
	const app = useMaybeApp()
	const auth = useAuth()
	const user = useValue('user', () => app?.getUser(), [app])
	const isSignedIn = !!auth.isSignedIn

	const storedConsent = useAnalyticsConsentValue()
	const currentConsent = isSignedIn && user && app ? user.allowAnalyticsCookie : storedConsent

	const updateConsent = useCallback(
		(newConsent: boolean) => {
			// localStorage and the atom stay in sync with the user record
			setStoredAnalyticsConsent(newConsent)
			if (isSignedIn && user && app) {
				app.updateUser({ id: user.id, allowAnalyticsCookie: newConsent })
				configureAnalytics(newConsent, { id: user.id, name: user.name, email: user.email })
			} else {
				configureAnalytics(newConsent, undefined)
			}

			trackEvent('consent_changed', { consent: newConsent })
		},
		[isSignedIn, user, app]
	)

	return [currentConsent, updateConsent] as const
}
