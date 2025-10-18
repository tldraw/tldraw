import Cookies from 'js-cookie'
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
			this.initialized = true
			return
		}

		// Read initial consent from cookie
		const cookieConsent = Cookies.get(CONSENT_COOKIE_NAME)
		this.value =
			cookieConsent === 'true' ? 'opted-in' : cookieConsent === 'false' ? 'opted-out' : 'unknown'

		this.initialized = true
		this.notify()
	}
}

export const cookieConsentState = new CookieConsentState('unknown')
