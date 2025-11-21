import Cookies from 'js-cookie'
import { CONSENT_COOKIE_NAME } from '../constants'
import { type ConsentOptInType, type CookieConsent, type CookieConsentData } from '../types'
import { AnalyticsState } from './state'

export function getCookieValue(): CookieConsentData | undefined {
	const cookieValue = Cookies.get(CONSENT_COOKIE_NAME)
	if (!cookieValue) return undefined

	// Try JSON format first
	try {
		const parsed = JSON.parse(cookieValue)
		if (parsed.consent && parsed.optInType) {
			return parsed as CookieConsentData
		}
	} catch {
		// Fall through to legacy format handling
	}

	// Migrate legacy boolean format: "true" or "false"
	if (cookieValue === 'true') {
		return { consent: 'opted-in', optInType: 'manual' }
	}
	if (cookieValue === 'false') {
		return { consent: 'opted-out', optInType: 'manual' }
	}

	return undefined
}

export function setCookieValue(consent: CookieConsent, optInType: ConsentOptInType): void {
	if (consent === 'unknown') {
		Cookies.remove(CONSENT_COOKIE_NAME)
	} else {
		Cookies.set(CONSENT_COOKIE_NAME, JSON.stringify({ consent, optInType }))
	}
}

export class CookieConsentState extends AnalyticsState<CookieConsent> {}
