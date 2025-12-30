import { ga4Gtag, ga4Service } from './analytics-services/ga4'
import { gtmService } from './analytics-services/gtm'
import { hubspotService } from './analytics-services/hubspot'
import { posthogService } from './analytics-services/posthog'
import { reoService } from './analytics-services/reo'
import { mountCookieConsentBanner } from './components/CookieConsentBanner'
import { mountPrivacySettingsDialog } from './components/PrivacySettingsDialog'
import {
	CookieConsentState,
	getCookieConsent,
	setOrClearCookieConsent,
} from './state/cookie-consent-state'
import { ThemeState } from './state/theme-state'
import styles from './styles.css?inline'
import { ConsentPreferences, CookieConsent } from './types'
import { shouldRequireConsent } from './utils/consent-check'

function cookieConsentToPreferences(
	consent: CookieConsent,
	consentOptInType: 'manual' | 'auto'
): ConsentPreferences {
	if (consent === 'opted-in') {
		return { analytics: 'granted', marketing: 'granted', opt_in_type: consentOptInType }
	}
	return { analytics: 'denied', marketing: 'denied', opt_in_type: consentOptInType }
}

class Analytics {
	private userId = '' as string
	private userProperties = {} as { [key: string]: any } | undefined
	private consent = 'unknown' as CookieConsent
	private consentOptInType: 'manual' | 'auto' = 'manual'
	private consentCallbacks: Array<(preferences: ConsentPreferences) => void> = []
	private isInitialized = false

	private services = [posthogService, ga4Service, gtmService, hubspotService, reoService]

	private maybeTrackConsentUpdate(consent: ConsentPreferences) {
		if (this.isInitialized) {
			this.track('consent_update', consent)
		} else {
			gtmService.trackEvent('consent_update', consent)
		}
	}

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
			// If the user changed the setting we want to change opt in type to manual
			if (this.isInitialized && consent !== 'unknown' && consent !== this.consent) {
				this.consentOptInType = 'manual'
			}
			// Set (or clear) the cookie value
			setOrClearCookieConsent(consent, this.consentOptInType)

			const consentState = cookieConsentToPreferences(consent, this.consentOptInType)

			// If the consent is the same as the current consent, do nothing
			if (consent === this.consent) {
				// We still send the event to gtm, so that we can send data to gtm on website reload
				gtmService.trackEvent('consent_update', consentState)
				return
			}

			this.consent = consent

			if (this.consent === 'opted-in') {
				// Enable the analytics services only when consent is granted
				for (const service of this.services) {
					service.enable()
				}

				this.maybeTrackConsentUpdate(consentState)

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
				this.maybeTrackConsentUpdate(consentState)
				// Disable the analytics services when consent is revoked or when consent is unknown
				for (const service of this.services) {
					service.disable()
				}
			}

			// Track consent selection only if user actually interacted with banner (not during initialization)
			if (this.isInitialized && consent !== 'unknown') {
				for (const service of this.services) {
					service.trackConsentBannerSelected?.(consentState)
				}
			}

			// Notify consent callbacks
			if (consent !== 'unknown') {
				for (const callback of this.consentCallbacks) {
					callback(consentState)
				}
			}
		})

		// ...also we stash a few things onto the window in case we need them elsewhere
		window.tlanalytics = {
			identify: this.identify.bind(this),
			reset: this.reset.bind(this),
			track: this.track.bind(this),
			page: this.page.bind(this),
			gtag: this.gtag.bind(this),
			getConsentState: () => cookieConsentToPreferences(this.consent, this.consentOptInType),
			onConsentUpdate: (callback: (preferences: ConsentPreferences) => void) => {
				this.consentCallbacks.push(callback)
				return () => {
					const index = this.consentCallbacks.indexOf(callback)
					if (index > -1) this.consentCallbacks.splice(index, 1)
				}
			},
			trackCopyCode: this.trackCopyCode.bind(this),
			trackFormSubmission: this.trackFormSubmission.bind(this),
			openPrivacySettings() {
				mountPrivacySettingsDialog(cookieConsentState, themeState, document.body)
			},
		}

		// Now that we have our subscriber set up, determine the initial consent state.
		// If the user has already made a choice (cookie exists), use that.
		// Otherwise, check their location to determine if we need explicit consent.
		const cookieData = getCookieConsent()
		let initialConsent: CookieConsent

		if (cookieData) {
			// User has previously made a consent decision - respect it and restore opt-in type
			initialConsent = cookieData.consent
			this.consentOptInType = cookieData.optInType
		} else {
			// No existing consent decision - check if we need to ask based on location
			const requiresConsent = await shouldRequireConsent()
			if (requiresConsent === 'requires-consent') {
				initialConsent = 'unknown'
				this.consentOptInType = 'manual'
			} else {
				initialConsent = 'opted-in'
				this.consentOptInType = 'auto'
			}
		}

		// This will trigger the subscriber we set up earlier, which will
		// enable/disable the analytics services accordingly
		cookieConsentState.setValue(initialConsent)

		// Now that we have the consent value in memory, we can initialize
		// the cookie consent banner and start showing some UI (if consent is unknown)
		const banner = mountCookieConsentBanner(cookieConsentState, themeState, document.body)

		// Track banner display if banner was shown
		if (banner) {
			for (const service of this.services) {
				service.trackConsentBannerDisplayed?.({
					consent_opt_in_type: this.consentOptInType,
				})
			}
		}

		// Mark initialization as complete - any consent changes after this are user interactions
		this.isInitialized = true
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

	/**
	 * Track code copy event. This should be called from window.tlanalytics when a user copies a code snippet.
	 *
	 * @param data - The code copy event data
	 * @returns void
	 */
	trackCopyCode(data: {
		page_category: string
		text_snippet: string
		user_email?: string
		user_email_sha256?: string
		user_first_name?: string
		user_last_name?: string
		user_phone_number?: string
	}) {
		for (const service of this.services) {
			service.trackCopyCode?.(data)
		}
	}

	/**
	 * Track form submission event. This should be called from window.tlanalytics when a user submits a form.
	 *
	 * @param data - The form submission event data
	 * @returns void
	 */
	trackFormSubmission(data: {
		enquiry_type: string
		page_category?: string
		company_size?: string
		company_website?: string
		user_email?: string
		user_email_sha256?: string
		user_first_name?: string
		user_last_name?: string
		user_phone_number?: string
	}) {
		for (const service of this.services) {
			service.trackFormSubmission?.(data)
		}
	}
}

try {
	const analytics = new Analytics()
	analytics.initialize()
} catch (error) {
	console.error('Error initializing analytics manager:', error)
}
