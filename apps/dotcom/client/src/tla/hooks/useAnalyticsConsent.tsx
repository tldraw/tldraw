import { TlaUser } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useState } from 'react'
import { getStoredAnalyticsConsent } from '../../utils/analytics'
import { TldrawApp } from '../app/TldrawApp'

/**
 * Custom hook to track analytics consent changes
 * @param isSignedIn - Whether the user is signed in
 * @param user - The user object (for signed-in users)
 * @param app - The app object (for signed-in users)
 * @returns The current consent state
 */
export function useAnalyticsConsent(isSignedIn: boolean, user?: TlaUser, app?: TldrawApp | null) {
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

	return consent
}
