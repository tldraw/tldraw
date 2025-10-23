import Cookies from 'js-cookie'
import { CONSENT_COOKIE_NAME } from '../constants'
import { type CookieConsent } from '../types'
import { AnalyticsState } from './state'

export function cookieConsentToCookieValue(consent: CookieConsent): string | undefined {
	switch (consent) {
		case 'opted-in':
			return 'true'
		case 'opted-out':
			return 'false'
		case 'unknown':
			return undefined
	}
}

export function getCookieValue(): string | undefined {
	return Cookies.get(CONSENT_COOKIE_NAME)
}

export function setCookieValue(value: string): void {
	Cookies.set(CONSENT_COOKIE_NAME, value)
}

export function clearCookieValue() {
	Cookies.remove(CONSENT_COOKIE_NAME)
}

export function cookieValueToCookieConsent(cookieValue: string | undefined): CookieConsent {
	if (cookieValue === 'true') return 'opted-in'
	if (cookieValue === 'false') return 'opted-out'
	return 'unknown'
}

export class CookieConsentState extends AnalyticsState<CookieConsent> {}
