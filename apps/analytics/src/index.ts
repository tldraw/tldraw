import { ga4Gtag, ga4Service } from './analytics-services/ga4'
import { hubspotService } from './analytics-services/hubspot'
import { posthogService } from './analytics-services/posthog'
import { reoService } from './analytics-services/reo'
import { mountCookieConsentBanner } from './components/CookieConsentBanner'
import { mountPrivacySettingsDialog } from './components/PrivacySettingsDialog'
import {
	clearCookieValue,
	CookieConsentState,
	cookieConsentToCookieValue,
	cookieValueToCookieConsent,
	getCookieValue,
	setCookieValue,
} from './state/cookie-consent-state'
import { ThemeState } from './state/theme-state'
import styles from './styles.css?inline'
import { CookieConsent } from './types'
import { shouldRequireConsent } from './utils/consent-check'

class Analytics {
	private userId = '' as string
	private userProperties = {} as { [key: string]: any } | undefined
	private consent = 'unknown' as CookieConsent

	private services = [posthogService, ga4Service, hubspotService, reoService]

	async initialize() {
		// Inject styles
		const style = document.createElement('style')
		style.textContent = styles
		document.head.appendChild(style)

		// Initialize the analytics services
		for (const service of this.services) {
			service.initialize()
		}

		// Set up our mini reactive states

		const themeState = new ThemeState('light')
		themeState.initialize()

		const cookieConsentState = new CookieConsentState('unknown')
		cookieConsentState.initialize()

		// Subscribe to consent changes
		cookieConsentState.subscribe((consent) => {
			// Set (or clear) the cookie value
			const cookieValue = cookieConsentToCookieValue(consent)
			if (cookieValue) setCookieValue(cookieValue)
			else clearCookieValue()

			// If the consent is the same as the current consent, do nothing
			if (consent === this.consent) return

			this.consent = consent

			if (this.consent === 'opted-in') {
				// Enable the analytics services only when consent is granted
				for (const service of this.services) {
					service.enable()
				}

				// Identify the user if we have a userId. Most of the time
				// identify() should be called off of the window.tlanalytics object, ie. in an app
				// where we have a user id and properties for that app (like tldraw computer). We do
				// it here, too, so that we can re-identify a user who has opted out of analytics
				// and then opts back in within the same session. We would have their user id and properties
				// in memory (from the first time they called identify) and would re-use them here.
				if (this.userId) {
					this.identify(this.userId, this.userProperties)
				}
			} else {
				// Disable the analytics services when consent is revoked or when consent is unknown
				for (const service of this.services) {
					service.disable()
				}
			}

			// Track the consent change (after enabling or disabling)
			this.track('consent_changed', { consent })
		})

		// Now that we have our subscriber set up, determine the initial consent state.
		// If the user has already made a choice (cookie exists), use that.
		// Otherwise, check their location to determine if we need explicit consent.
		const initialCookieValue = getCookieValue()
		let initialConsent: CookieConsent

		if (initialCookieValue) {
			// User has previously made a consent decision - respect it
			initialConsent = cookieValueToCookieConsent(initialCookieValue)
		} else {
			// No existing consent decision - check if we need to ask based on location
			const requiresConsent = await shouldRequireConsent()
			initialConsent = requiresConsent ? 'unknown' : 'opted-in'
		}

		// This will trigger the subscriber we set up earlier, which will
		// enable/disable the analytics services accordingly
		cookieConsentState.setValue(initialConsent)

		// Now that we have the consent value in memory, we can initialize
		// the cookie consent banner and start showing some UI (if consent is unknown)
		mountCookieConsentBanner(cookieConsentState, themeState, document.body)

		// ...also we stash a few things onto the window in case we need them elsewhere
		window.tlanalytics = {
			identify: this.identify.bind(this),
			reset: this.reset.bind(this),
			track: this.track.bind(this),
			page: this.page.bind(this),
			gtag: this.gtag.bind(this),
			openPrivacySettings() {
				mountPrivacySettingsDialog(cookieConsentState, themeState, document.body)
			},
		}
	}

	/**
	 * Wrap and guard google analytics tag. This should be called from window.tlanalytics, ie. in an app where we have a user id and properties for that app (like tldraw computer).
	 *
	 * @param args - The arguments to pass to the google analytics tag
	 * @returns void
	 */
	gtag(...args: any[]) {
		if (this.consent !== 'opted-in') return
		ga4Gtag(...args)
	}

	/**
	 * Identify the user across all analytics services. This should be called from window.tlanalytics, ie. in an app where we have a user id and properties for that app (like tldraw computer).
	 *
	 * @param userId - The user id to identify the user by
	 * @param properties - The properties to identify the user by
	 * @returns void
	 */
	identify(userId: string, properties?: { [key: string]: any }) {
		this.userId = userId
		this.userProperties = properties

		if (this.consent !== 'opted-in') return

		for (const service of this.services) {
			service.identify(userId, properties)
		}
	}

	/**
	 * Reset the user identity across all analytics services. This should be called from window.tlanalytics when a user logs out.
	 *
	 * @returns void
	 */
	reset() {
		this.userId = ''
		this.userProperties = undefined

		for (const service of this.services) {
			service.reset()
		}
	}

	/**
	 * Track an event across all analytics services. This should be called from window.tlanalytics, ie. in an app where we have a user id and properties for that app (like tldraw computer).
	 *
	 * @param name - The name of the event to track
	 * @param data - The data to track with the event
	 * @returns void
	 */
	track(name: string, data?: { [key: string]: any }) {
		for (const service of this.services) {
			service.trackEvent(name, data)
		}
	}

	/**
	 * Track a page view across all analytics services. This should be called from window.tlanalytics, ie. in an app where we have a user id and properties for that app (like tldraw computer).
	 *
	 * @returns void
	 */
	page() {
		for (const service of this.services) {
			service.trackPageview()
		}
	}
}

try {
	const analytics = new Analytics()
	analytics.initialize()
} catch (error) {
	console.error('Error initializing analytics manager:', error)
}
