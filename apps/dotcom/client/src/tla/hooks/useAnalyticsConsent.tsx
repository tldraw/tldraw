import { useAuth } from '@clerk/clerk-react'
import { useCallback, useEffect, useState } from 'react'
import { useValue } from 'tldraw'
import {
	configureAnalytics,
	getStoredAnalyticsConsent,
	setStoredAnalyticsConsent,
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

	const getCurrentConsent = useCallback(() => {
		if (isSignedIn && user && app) {
			return user.allowAnalyticsCookie
		} else {
			return getStoredAnalyticsConsent()
		}
	}, [isSignedIn, user, app])

	const [consent, setConsent] = useState<boolean | null>(getCurrentConsent)

	// Update consent when external state changes
	useEffect(() => {
		const checkConsent = () => {
			setConsent(getCurrentConsent())
		}

		// Check on mount and when dependencies change
		checkConsent()

		// Listen for storage events (when localStorage changes in other tabs/windows)
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === 'tldraw_analytics_consent') {
				checkConsent()
			}
		}

		window.addEventListener('storage', handleStorageChange)

		// Create a custom event listener for same-tab changes
		const handleCustomStorageChange = () => {
			checkConsent()
		}

		// Listen for custom events that can be dispatched when consent changes
		window.addEventListener('analytics-consent-changed', handleCustomStorageChange)

		return () => {
			window.removeEventListener('storage', handleStorageChange)
			window.removeEventListener('analytics-consent-changed', handleCustomStorageChange)
		}
	}, [getCurrentConsent])

	// Function to update consent
	const updateConsent = useCallback(
		(newConsent: boolean) => {
			if (isSignedIn && user && app) {
				app.updateUser({ id: user.id, allowAnalyticsCookie: newConsent })
				// Also update localStorage to keep them in sync
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

	return [consent, updateConsent] as const
}
