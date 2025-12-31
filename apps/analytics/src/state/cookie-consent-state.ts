import Cookies from 'js-cookie'
import { CONSENT_COOKIE_NAME, LEGACY_CONSENT_COOKIE_NAME } from '../constants'
import {
	CONSENT_OPT_IN_TYPES,
	COOKIE_CONSENT_VALUES,
	type ConsentOptInType,
	type CookieConsent,
	type CookieConsentData,
} from '../types'
import { AnalyticsState } from './state'

function isValidCookieConsentData(data: any): data is CookieConsentData {
	return (
		typeof data === 'object' &&
		data !== null &&
		COOKIE_CONSENT_VALUES.includes(data.consent) &&
		CONSENT_OPT_IN_TYPES.includes(data.optInType)
	)
}

export function getCookieConsent(): CookieConsentData | undefined {
	// Check new cookie format first - takes precedence
	const cookieValue = Cookies.get(CONSENT_COOKIE_NAME)
	if (cookieValue) {
		// Parse JSON format
		try {
			const parsed = JSON.parse(cookieValue)
			if (isValidCookieConsentData(parsed)) {
				// Clean up legacy cookie if it exists
				Cookies.remove(LEGACY_CONSENT_COOKIE_NAME)
				return parsed
			}
		} catch {
			// Invalid JSON - fall through to legacy check
		}
	}

	// Check for legacy cookie and migrate
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

	return undefined
}

export function setOrClearCookieConsent(consent: CookieConsent, optInType: ConsentOptInType): void {
	if (consent === 'unknown') {
		Cookies.remove(CONSENT_COOKIE_NAME)
	} else {
		Cookies.set(CONSENT_COOKIE_NAME, JSON.stringify({ consent, optInType }))
	}
}

export class CookieConsentState extends AnalyticsState<CookieConsent> {}
