import Cookies from 'js-cookie'
import { useEffect, useState } from 'react'
import { CONSENT_COOKIE_NAME, type CookieConsent } from './types'

export function readStoredConsent(): CookieConsent {
	const consent = Cookies.get(CONSENT_COOKIE_NAME)

	if (consent === 'true') return 'opted-in'
	if (consent === 'false') return 'opted-out'

	return 'unknown'
}

export function writeConsentCookie(consent: CookieConsent) {
	if (consent === 'opted-in') {
		Cookies.set(CONSENT_COOKIE_NAME, 'true')
		return
	}

	if (consent === 'opted-out') {
		Cookies.set(CONSENT_COOKIE_NAME, 'false')
		return
	}

	Cookies.remove(CONSENT_COOKIE_NAME)
}

export function useCookieConsent() {
	const [consent, setConsent] = useState<CookieConsent>('unknown')
	const [isLoaded, setIsLoaded] = useState(false)

	useEffect(() => {
		const storedConsent = readStoredConsent()
		setConsent(storedConsent)
		setIsLoaded(true)
	}, [])

	return {
		consent,
		isLoaded,
		updateConsent: setConsent,
	}
}
