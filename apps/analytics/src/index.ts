import Cookies from 'js-cookie'
import { ga4Gtag } from './analytics-services/ga4'
import { ANALYTICS_SERVICES } from './analytics-services/services'
import { mountCookieConsentBanner } from './components/CookieConsentBanner'
import { mountPrivacySettingsDialog } from './components/PrivacySettingsDialog'
import { CONSENT_COOKIE_NAME } from './constants'
import {
	CookieConsentState,
	cookieConsentToCookieValue,
	cookieValueToCookieConsent,
	getCookieValue,
} from './state/cookie-consent-state'
import { ThemeState } from './state/theme-state'
import styles from './styles.css?inline'
import { CookieConsent } from './types'

const inMemoryAnalyticsState = {
	userId: '' as string,
	properties: {} as { [key: string]: any } | undefined,
	hasConsent: 'unknown' as CookieConsent,
}

// Identify the user across all analytics services
function identify(userId: string, properties?: { [key: string]: any }) {
	inMemoryAnalyticsState.userId = userId
	inMemoryAnalyticsState.properties = properties

	if (inMemoryAnalyticsState.hasConsent !== 'opted-in') return

	for (const service of ANALYTICS_SERVICES) {
		service.identify(userId, properties)
	}
}

// Track an event across all analytics services
function track(name: string, data?: { [key: string]: any }) {
	for (const service of ANALYTICS_SERVICES) {
		service.trackEvent(name, data)
	}
}

function main() {
	// Inject styles
	const style = document.createElement('style')
	style.textContent = styles
	document.head.appendChild(style)

	// 1. ANALYTICS SERVICES

	// Dispose all of the analytics services
	for (const service of ANALYTICS_SERVICES) {
		service.dispose()
	}

	// Initialize the analytics services
	for (const service of ANALYTICS_SERVICES) {
		service.initialize()
	}

	// 2. STATE

	// Create the cookie consent and theme states
	const cookieConsentState = new CookieConsentState('unknown')
	const themeState = new ThemeState('light')

	// Clean up the cookie consent and theme states (if for some reason the script is re-run)
	cookieConsentState.dispose()
	themeState.dispose()

	// Initialize the cookie consent and theme states
	cookieConsentState.initialize()
	themeState.initialize()

	// Subscribe to consent changes and apply them to the analytics services
	cookieConsentState.subscribe((consent) => {
		// Track the consent change
		track('consent_changed', { consent })

		// Set the cookie value
		const cookieValue = cookieConsentToCookieValue(consent)
		if (cookieValue) {
			Cookies.set(CONSENT_COOKIE_NAME, cookieValue)
		} else {
			Cookies.remove(CONSENT_COOKIE_NAME)
		}

		// If the consent is the same as the current consent, do nothing
		if (consent === inMemoryAnalyticsState.hasConsent) return

		inMemoryAnalyticsState.hasConsent = consent

		if (consent === 'opted-in') {
			// Enable the analytics services only when consent is granted
			for (const service of ANALYTICS_SERVICES) {
				service.enable()
			}

			// Identify the user
			identify(inMemoryAnalyticsState.userId, inMemoryAnalyticsState.properties)
		} else {
			// Disable the analytics services when consent is revoked or when consent is unknown
			for (const service of ANALYTICS_SERVICES) {
				service.disable()
			}
		}
	})

	// 3. KICKOFF

	// Get the initial analytics consent from the cookie
	const consent = getCookieValue()
	const cookieConsent = cookieValueToCookieConsent(consent)

	// Apply the initial analytics consent. The service starts
	// with an unknown value. If an opt-in consent is found,
	// it will enable the analytics services; if no value is
	// found, or if the value is false, it will be a no-op.
	cookieConsentState.setValue(cookieConsent)

	// 4. FRONTEND

	// Initialize the cookie consent banner
	mountCookieConsentBanner(cookieConsentState, themeState, document.body)

	// 5. WINDOW / GLOBALS

	window.tlanalytics = {
		identify,
		track,
		page() {
			for (const service of ANALYTICS_SERVICES) {
				service.trackPageview()
			}
		},
		openPrivacySettings() {
			mountPrivacySettingsDialog(cookieConsentState, themeState, document.body)
		},
		gtag(...args: any[]) {
			if (inMemoryAnalyticsState.hasConsent !== 'opted-in') return
			ga4Gtag(...args)
		},
	}
}

main()
