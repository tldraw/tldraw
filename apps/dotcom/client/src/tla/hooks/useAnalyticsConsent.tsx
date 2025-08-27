import { useAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'
import { useValue } from 'tldraw'
import {
	configureAnalytics,
	setStoredAnalyticsConsent,
	useAnalyticsConsentValue,
} from '../../utils/analytics'
import { useMaybeApp } from '../hooks/useAppState'

/**
 * Custom hook to track analytics consent changes
 * Consent can be either a boolean (user has set their preference) or null (user has not set their preference yet)
 * @returns [consent, updateConsent] - The current consent state and function to update it
 */
export function useAnalyticsConsent() {
	const app = useMaybeApp()
	const auth = useAuth()
	const user = useValue('user', () => app?.getUser(), [app])
	const isSignedIn = !!auth.isSignedIn

	const storedConsent = useAnalyticsConsentValue()
	const currentConsent = isSignedIn && user && app ? user.allowAnalyticsCookie : storedConsent

	const updateConsent = useCallback(
		(newConsent: boolean) => {
			if (isSignedIn && user && app) {
				app.updateUser({ id: user.id, allowAnalyticsCookie: newConsent })
				// Also update localStorage and atom to keep them in sync
				setStoredAnalyticsConsent(newConsent)
				// Immediately configure analytics
				configureAnalytics(newConsent, { id: user.id, name: user.name, email: user.email })
			} else {
				setStoredAnalyticsConsent(newConsent)
				// Immediately configure analytics for signed-out users
				configureAnalytics(newConsent, undefined)
			}
		},
		[isSignedIn, user, app]
	)

	return [currentConsent, updateConsent] as const
}
