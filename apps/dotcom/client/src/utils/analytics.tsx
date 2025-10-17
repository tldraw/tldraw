import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../tla/hooks/useAppState'
import { setStoredAnalyticsConsent, useAnalyticsConsentValue } from './analytics/cookie-consent'
import { ga4Client } from './analytics/ga4-client'
import { posthogClient } from './analytics/posthog-client'
import { setupReo } from './analytics/reo-client'
import { AnalyticsOptions } from './analytics/shared'

// Re-export cookie consent utilities
export {
	COOKIE_CONSENT_KEY,
	cookieConsent,
	getStoredCookieConsent,
	setStoredAnalyticsConsent,
	setStoredCookieConsent,
	useAnalyticsConsentValue,
} from './analytics/cookie-consent'

export function configureAnalytics(
	consent: boolean,
	user: { id: string; name: string; email: string } | undefined
) {
	const options: AnalyticsOptions = {
		optedIn: consent,
		user,
	}

	posthogClient.configure(options)
	ga4Client.configure(options)

	if (user) {
		setupReo(options)
	}
}

export function trackEvent(name: string, data?: { [key: string]: any }) {
	posthogClient.trackEvent(name, data)
	ga4Client.trackEvent(name, data)
}

export function useHandleUiEvents() {
	return trackEvent
}

export function SignedOutAnalytics() {
	const storedConsent = useAnalyticsConsentValue()

	useEffect(() => {
		configureAnalytics(storedConsent === true, undefined)
		document.getElementById('reo-iframe-loader')?.remove()
	}, [storedConsent])

	useTrackPageViews()

	return null
}

export function SignedInAnalytics() {
	const app = useApp()
	const user = useValue('userData', () => app.getUser(), [app])
	const storedConsent = useAnalyticsConsentValue()

	useEffect(() => {
		const userConsent = user.allowAnalyticsCookie

		// If user has no preference in database but has one in atom/localStorage, sync it
		if (userConsent === null && storedConsent !== null) {
			app.updateUser({ id: user.id, allowAnalyticsCookie: storedConsent })
		}

		// Sync database consent to atom/localStorage to keep them in sync
		// This will run if a logged in user changes their preference
		if (userConsent !== null && userConsent !== storedConsent) {
			setStoredAnalyticsConsent(userConsent)
		}

		// Use user's database preference if available, otherwise fall back to stored consent
		const finalConsent = userConsent !== null ? userConsent : storedConsent === true

		configureAnalytics(finalConsent, { id: user.id, name: user.name, email: user.email })
	}, [user.allowAnalyticsCookie, user.email, user.id, user.name, app, storedConsent])

	useTrackPageViews()

	return null
}

function useTrackPageViews() {
	const location = useLocation()
	useEffect(() => {
		trackEvent('$pageview')
	}, [location])
}
