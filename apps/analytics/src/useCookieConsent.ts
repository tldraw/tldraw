import Cookies from 'js-cookie'
import { useSyncExternalStore } from 'react'
import { applyConsent, track } from './analytics'
import { CONSENT_COOKIE_NAME, type CookieConsent } from './types'

/*
The `useCookieConsent` hook is used to track the consent of the user. It shares
a single source of truth for the consent of the user across the application. The
consent's initial value is loaded from the cookie. The consent can be updated
using the `updateConsent` function. Updating the consent will also update the cookie
and track the consent change in analytics.
*/

type CookieConsentState =
	| { name: 'not-loaded'; value: 'unknown' }
	| { name: 'loaded'; value: CookieConsent }
	| { name: 'changed'; value: CookieConsent; previousValue: CookieConsent }

const sharedCookieConsent = {
	_state: { name: 'not-loaded', value: 'unknown' } as CookieConsentState,
	_listeners: new Set<() => void>(),
	subscribe(listener: () => void) {
		this._listeners.add(listener)
		return () => this._listeners.delete(listener)
	},
	getSnapshot() {
		if (this._state.name === 'not-loaded') {
			// If trying to read the state before the initial value is loaded, load the cookie consent from the cookie
			const cookieConsent = Cookies.get(CONSENT_COOKIE_NAME)
			const value =
				cookieConsent === 'true' ? 'opted-in' : cookieConsent === 'false' ? 'opted-out' : 'unknown'
			this._state = { name: 'loaded', value }

			// Apply the initial analytics consent to the analytics services
			applyConsent(value)
		}
		return this._state.value
	},
	setConsent(value: boolean | null) {
		const nextConsent: CookieConsent = value === null ? 'unknown' : value ? 'opted-in' : 'opted-out'
		let previousValue: CookieConsent = 'unknown'

		// If the state is not loaded...
		if (this._state.name === 'not-loaded') {
			// Something must have gone wrong for us to be trying to set the consent before the initial value is loaded
			console.error('Trying to set the consent before the initial value is loaded')
		} else {
			previousValue = this._state.value
		}

		// Update the state to the new value
		this._state = { name: 'changed', value: nextConsent, previousValue }

		// Track the consent change
		track('consent_changed', { consent: nextConsent })

		// Also update the cookie
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
		this._listeners.forEach((listener) => listener())
	},
}

export function useCookieConsent() {
	const consent = useSyncExternalStore(
		sharedCookieConsent.subscribe,
		sharedCookieConsent.getSnapshot
	)

	return {
		consent,
		updateConsent: sharedCookieConsent.setConsent,
	}
}
