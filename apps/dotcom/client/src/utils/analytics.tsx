import posthog, { PostHogConfig, Properties } from 'posthog-js'
import 'posthog-js/dist/web-vitals'
import { useEffect } from 'react'
import ReactGA from 'react-ga4'
import { useLocation } from 'react-router-dom'
import { atom, getFromLocalStorage, react, setInLocalStorage, useValue, warnOnce } from 'tldraw'
import { useApp } from '../tla/hooks/useAppState'

// Local storage key for cookie consent
export const COOKIE_CONSENT_KEY = 'tldraw_cookie_consent'

// Cookie consent structure
interface CookieConsent {
	analytics: boolean
	// Future consent types can be added here
	// marketing?: boolean
	// functional?: boolean
}

// Cookie consent atom - stores the full consent object
export const cookieConsent = atom<CookieConsent | null>('cookie consent', getStoredCookieConsent())

// React to changes in the atom and sync with localStorage
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

// Helper function to get analytics consent from the atom
export function useAnalyticsConsentValue(): boolean | null {
	return useValue('analytics consent', () => cookieConsent.get()?.analytics ?? null, [
		cookieConsent,
	])
}

export type AnalyticsOptions =
	| {
			optedIn: true
			user:
				| {
						id: string
						name: string
						email: string
				  }
				| undefined
	  }
	| {
			optedIn: false
			user?: {
				id: string
				name: string
				email: string
			}
	  }

// @ts-ignore this is fine
const POSTHOG_KEY: string | undefined = import.meta.env.VITE_POSTHOG_KEY
const shouldUsePosthog = POSTHOG_KEY !== undefined

// @ts-ignore this is fine
const GA4_MEASUREMENT_ID: string | undefined = import.meta.env.VITE_GA4_MEASUREMENT_ID
const shouldUseGA4 = GA4_MEASUREMENT_ID !== undefined

const PROPERTIES_TO_REDACT = ['url', 'href', 'pathname']

// Match property names against the defined list
function filterProperties(value: { [key: string]: any }) {
	return Object.entries(value).reduce<{ [key: string]: any }>((acc, [key, value]) => {
		// N.B. This isn't super obvious but Posthog has keys that can be like
		// `$pathname` for native events, but also you could have `pathname` for custom events.
		// So we check for both here.
		if (PROPERTIES_TO_REDACT.some((prop) => key.includes(prop))) {
			acc[key] = 'redacted'
		} else {
			acc[key] = value
		}
		return acc
	}, {})
}

// Helper functions for localStorage consent management
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
	// Ensure we only set the atom if we have a complete CookieConsent object
	if (updated.analytics !== undefined) {
		cookieConsent.set(updated as CookieConsent)
	}
}

export function setStoredAnalyticsConsent(consent: boolean): void {
	setStoredCookieConsent({ analytics: consent })
}

// Function to configure analytics when consent changes
export function configureAnalytics(
	consent: boolean,
	user: { id: string; name: string; email: string } | undefined
) {
	configurePosthog({
		optedIn: consent,
		user,
	} as AnalyticsOptions)

	configureGA4({
		optedIn: consent,
		user,
	} as AnalyticsOptions)

	if (user) {
		setupReo({
			optedIn: consent,
			user,
		})
	}
}

let currentOptionsPosthog: AnalyticsOptions | null = null
let eventBufferPosthog: null | Array<{ name: string; data: Properties | null | undefined }> = []
function configurePosthog(options: AnalyticsOptions) {
	if (!shouldUsePosthog) return

	const hashParams = new URLSearchParams(window.location.hash.substring(1))
	const sessionID = hashParams.get('session_id')
	const distinctID = hashParams.get('distinct_id')
	const config: Partial<PostHogConfig> = {
		api_host: 'https://analytics.tldraw.com/i',
		ui_host: 'https://eu.i.posthog.com',
		capture_pageview: false,
		persistence: options.optedIn ? 'localStorage+cookie' : 'memory',
		before_send: (payload) => {
			if (!payload) return null
			payload.properties.is_signed_in = !!options.user

			const redactedProperties = filterProperties(payload.properties || {})
			payload.properties = redactedProperties

			// $set
			const redactedSet = filterProperties(payload.$set || {})
			payload.$set = redactedSet

			// $set_once
			const redactedSetOnce = filterProperties(payload.$set_once || {})
			payload.$set_once = redactedSetOnce

			return payload
		},
		bootstrap:
			sessionID && distinctID
				? {
						sessionID,
						distinctID,
					}
				: undefined,
	}
	if (!currentOptionsPosthog) {
		posthog.init(POSTHOG_KEY, config)
	}

	if (options.optedIn) {
		if (options.user) {
			posthog.identify(options.user.id, {
				email: options.user.email,
				name: options.user.name,
			})
		}
	} else if (currentOptionsPosthog?.optedIn) {
		posthog.reset()
	}

	posthog.set_config(config)
	currentOptionsPosthog = options
	eventBufferPosthog?.forEach((event) => posthog.capture(event.name, event.data))
	eventBufferPosthog = null
}

let currentOptionsGA4: AnalyticsOptions | null = null
let eventBufferGA4: null | Array<{ name: string; data: Properties | null | undefined }> = []
function configureGA4(options: AnalyticsOptions) {
	if (!shouldUseGA4) return

	if (!currentOptionsGA4) {
		ReactGA.gtag('consent', 'default', {
			ad_storage: 'denied',
			ad_user_data: 'denied',
			ad_personalization: 'denied',
			analytics_storage: 'denied',
			// Wait for our cookie to load.
			wait_for_update: 500,
		})

		ReactGA.initialize(GA4_MEASUREMENT_ID, {
			gtagOptions: {
				send_page_view: false,
			},
		})
	}

	if (options.optedIn) {
		if (options.user) {
			ReactGA.set({ userId: options.user.id, anonymize_ip: false })
		}
		ReactGA.gtag('consent', 'update', {
			ad_user_data: 'granted',
			ad_personalization: 'granted',
			ad_storage: 'granted',
			analytics_storage: 'granted',
		})
	} else if (currentOptionsGA4?.optedIn) {
		ReactGA.set({ anonymize_ip: true })
		ReactGA.reset()

		ReactGA.gtag('consent', 'update', {
			ad_user_data: 'denied',
			ad_personalization: 'denied',
			ad_storage: 'denied',
			analytics_storage: 'denied',
		})
	}

	currentOptionsGA4 = options
	eventBufferGA4?.forEach((event) => ReactGA!.event(event.name, event.data ?? {}))
	eventBufferGA4 = null
}

function getPosthog() {
	if (!shouldUsePosthog) return null
	if (!currentOptionsPosthog) {
		warnOnce('getPosthog called before configurePosthog - buffering')
		return {
			capture(name: string, data: any) {
				eventBufferPosthog?.push({ name, data })
			},
		}
	}
	return posthog
}

function getGA4() {
	if (!shouldUseGA4) return null
	if (!currentOptionsGA4) {
		warnOnce('getGA4 called before configureGA4 - buffering')
		return {
			event(name: string, data: any) {
				eventBufferGA4?.push({ name, data })
			},
		}
	}
	return ReactGA
}

export function trackEvent(name: string, data?: { [key: string]: any }) {
	getPosthog()?.capture(name, data)

	// Send pageviews to both platforms, but other app-specific events only to PostHog
	if (name === '$pageview') {
		getGA4()?.event('page_view', data)
	}
}

export function useHandleUiEvents() {
	return trackEvent
}

export function SignedOutAnalytics() {
	const storedConsent = useAnalyticsConsentValue()

	useEffect(() => {
		configureAnalytics(storedConsent === true, undefined)
		document.getElementById('reo-iframe-loader')?.remove()
	}, [storedConsent])

	useTrackPageViews()

	return null
}

function setupReo(options: AnalyticsOptions) {
	if (options.optedIn === false) return

	const user = options.user

	function postToReoIframe(type: 'identify', payload?: any) {
		const iframe = document.getElementById('reo-iframe-loader') as HTMLIFrameElement | null
		if (iframe?.contentWindow) {
			iframe.contentWindow.postMessage({ type, payload })
		}
	}

	const reoIdentify = () =>
		postToReoIframe('identify', {
			firstname: user?.name || '',
			username: user?.email || '',
			type: 'email',
			userId: user?.id || '',
		})

	if (!document.getElementById('reo-iframe-loader')) {
		const iframeTag = document.createElement('iframe')
		iframeTag.id = 'reo-iframe-loader'
		iframeTag.style.display = 'none'
		iframeTag.src = '/reo.html'
		iframeTag.onload = () => reoIdentify()
		document.body.appendChild(iframeTag)
	} else {
		reoIdentify()
	}
}

export function SignedInAnalytics() {
	const app = useApp()
	const user = useValue('userData', () => app.getUser(), [app])
	const storedConsent = useAnalyticsConsentValue()

	useEffect(() => {
		const userConsent = user.allowAnalyticsCookie

		// If user has no preference in database but has one in atom/localStorage, sync it
		if (userConsent === null && storedConsent !== null) {
			app.updateUser({ id: user.id, allowAnalyticsCookie: storedConsent })
		}

		// Sync database consent to atom/localStorage to keep them in sync
		// This will run if a logged in user changes their preference
		if (userConsent !== null && userConsent !== storedConsent) {
			setStoredAnalyticsConsent(userConsent)
		}

		// Use user's database preference if available, otherwise fall back to stored consent
		const finalConsent = userConsent !== null ? userConsent : storedConsent === true

		configureAnalytics(finalConsent, { id: user.id, name: user.name, email: user.email })
	}, [user.allowAnalyticsCookie, user.email, user.id, user.name, app, storedConsent])

	useTrackPageViews()

	return null
}

function useTrackPageViews() {
	const location = useLocation()
	useEffect(() => {
		trackEvent('$pageview')
	}, [location])
}
