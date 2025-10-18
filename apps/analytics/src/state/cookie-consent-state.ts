import Cookies from 'js-cookie'
import { applyConsent, track } from '../analytics'
import { CONSENT_COOKIE_NAME } from '../constants'
import { type CookieConsent } from '../types'
import { AnalyticsState } from './state'

class CookieConsentState extends AnalyticsState<CookieConsent> {
	override initialize(): void {
		if (this.initialized) return

		// If document is not available, default to unknown
		if (typeof document === 'undefined') {
			this.value = 'unknown'
			this.notify()
			return
		}

		// Read initial consent from cookie
		const cookieConsent = Cookies.get(CONSENT_COOKIE_NAME)
		this.value =
			cookieConsent === 'true' ? 'opted-in' : cookieConsent === 'false' ? 'opted-out' : 'unknown'

		// Apply the initial analytics consent to the analytics services
		applyConsent(this.value)

		this.initialized = true
		this.notify()
	}
	override dispose(): void {
		this.initialized = false
	}
	override setValue(value: CookieConsent): void {
		// Update the state to the new value
		this.value = value

		// Track the consent change
		track('consent_changed', { consent: value })

		// Update the cookie
		switch (value) {
			case 'opted-in':
				Cookies.set(CONSENT_COOKIE_NAME, 'true')
				break
			case 'opted-out':
				Cookies.set(CONSENT_COOKIE_NAME, 'false')
				break
			case 'unknown':
				Cookies.remove(CONSENT_COOKIE_NAME)
				break
		}

		// Apply the new analytics consent to the analytics services
		applyConsent(value)

		// Notify listeners
		this.notify()
	}
}

export const cookieConsentState = new CookieConsentState('unknown')
