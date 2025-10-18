import Cookies from 'js-cookie'
import { applyConsent, track } from './analytics'
import { CONSENT_COOKIE_NAME } from './constants'
import { type CookieConsent } from './types'

export const cookieConsentState = {
	_consent: 'unknown' as CookieConsent,
	_initialized: false,
	_listeners: new Set<(consent: CookieConsent) => void>(),
	subscribe(listener: (consent: CookieConsent) => void) {
		this._listeners.add(listener)
		return () => this._listeners.delete(listener)
	},
	notify() {
		this._listeners.forEach((listener) => listener(this._consent))
	},
	initialize() {
		if (this._initialized) return

		// If document is not available, default to unknown
		if (typeof document === 'undefined') {
			this._consent = 'unknown'
			this.notify()
			return
		}

		// Read initial consent from cookie
		const cookieConsent = Cookies.get(CONSENT_COOKIE_NAME)
		this._consent =
			cookieConsent === 'true' ? 'opted-in' : cookieConsent === 'false' ? 'opted-out' : 'unknown'

		// Apply the initial analytics consent to the analytics services
		applyConsent(this._consent)

		this._initialized = true
		this.notify()
	},
	dispose() {
		this._initialized = false
	},
	getCurrentConsent() {
		if (!this._initialized) {
			this.initialize()
		}
		return this._consent
	},
	setConsent(value: boolean | null) {
		const nextConsent: CookieConsent = value === null ? 'unknown' : value ? 'opted-in' : 'opted-out'

		// Update the state to the new value
		this._consent = nextConsent

		// Track the consent change
		track('consent_changed', { consent: nextConsent })

		// Update the cookie
		switch (nextConsent) {
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
		applyConsent(nextConsent)

		// Notify listeners
		this.notify()
	},
}
