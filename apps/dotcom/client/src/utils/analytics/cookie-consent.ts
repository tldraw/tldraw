import { atom, getFromLocalStorage, react, setInLocalStorage, useValue } from 'tldraw'

export const COOKIE_CONSENT_KEY = 'tldraw_cookie_consent'

export interface CookieConsent {
	analytics: boolean
}

export const cookieConsent = atom<CookieConsent | null>('cookie consent', getStoredCookieConsent())

react('sync cookie consent to localStorage', () => {
	const consent = cookieConsent.get()
	if (consent !== null) {
		try {
			setInLocalStorage(COOKIE_CONSENT_KEY, JSON.stringify(consent))
		} catch {
			// Ignore localStorage errors
		}
	}
})

export function useAnalyticsConsentValue(): boolean | null {
	return useValue('analytics consent', () => cookieConsent.get()?.analytics ?? null, [
		cookieConsent,
	])
}

export function getStoredCookieConsent(): CookieConsent | null {
	try {
		const stored = getFromLocalStorage(COOKIE_CONSENT_KEY)
		if (!stored) return null
		return JSON.parse(stored) as CookieConsent
	} catch {
		return null
	}
}

export function setStoredCookieConsent(consent: Partial<CookieConsent>): void {
	const existing = cookieConsent.get() || {}
	const updated = { ...existing, ...consent }
	if (updated.analytics !== undefined) {
		cookieConsent.set(updated as CookieConsent)
	}
}

export function setStoredAnalyticsConsent(consent: boolean): void {
	setStoredCookieConsent({ analytics: consent })
}
