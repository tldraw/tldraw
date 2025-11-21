import Cookies from 'js-cookie'
import { CONSENT_COOKIE_NAME, LEGACY_CONSENT_COOKIE_NAME } from '../constants'
import { type ConsentOptInType, type CookieConsent, type CookieConsentData } from '../types'
import { AnalyticsState } from './state'

export function getCookieValue(): CookieConsentData | undefined {
	// Check for legacy cookie first and migrate
	const legacyCookieValue = Cookies.get(LEGACY_CONSENT_COOKIE_NAME)
	if (legacyCookieValue) {
		let migrated: CookieConsentData | undefined

		if (legacyCookieValue === 'true') {
			migrated = { consent: 'opted-in', optInType: 'manual' }
		} else if (legacyCookieValue === 'false') {
			migrated = { consent: 'opted-out', optInType: 'manual' }
		}

		if (migrated) {
			// Write to new cookie and delete old one
			Cookies.set(CONSENT_COOKIE_NAME, JSON.stringify(migrated))
			Cookies.remove(LEGACY_CONSENT_COOKIE_NAME)
			return migrated
		}
	}

	// Check new cookie format
	const cookieValue = Cookies.get(CONSENT_COOKIE_NAME)
	if (!cookieValue) return undefined

	// Parse JSON format
	try {
		const parsed = JSON.parse(cookieValue)
		if (parsed.consent && parsed.optInType) {
			return parsed as CookieConsentData
		}
	} catch {
		// Invalid JSON
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
