import posthog, { PostHogConfig, Properties } from 'posthog-js'
import 'posthog-js/dist/web-vitals'
import { useEffect } from 'react'
import ReactGA from 'react-ga4'
import { useLocation } from 'react-router-dom'
import { useValue, warnOnce } from 'tldraw'
import { useApp } from '../tla/hooks/useAppState'

export type AnalyticsOptions =
	| {
			optedIn: true
			user: {
				id: string
				name: string
				email: string
			}
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

let currentOptionsPosthog: AnalyticsOptions | null = null
let eventBufferPosthog: null | Array<{ name: string; data: Properties | null | undefined }> = []
function configurePosthog(options: AnalyticsOptions) {
	if (!shouldUsePosthog) return

	const hashParams = new URLSearchParams(window.location.hash.substring(1))
	const sessionID = hashParams.get('session_id')
	const distinctID = hashParams.get('distinct_id')
	const config: Partial<PostHogConfig> = {
		api_host: 'https://analytics.tldraw.com/ingest',
		ui_host: 'https://eu.i.posthog.com',
		capture_pageview: false,
		persistence: options.optedIn ? 'localStorage+cookie' : 'memory',
		before_send: (payload) => {
			if (!payload) return null
			payload.properties.is_signed_in = !!options.user
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
		posthog.identify(options.user.id, {
			email: options.user.email,
			name: options.user.name,
		})
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

		ReactGA.initialize(GA4_MEASUREMENT_ID)
		ReactGA.send('pageview')
	}

	if (options.optedIn) {
		ReactGA.set({ userId: options.user.id, anonymize_ip: false })
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
	getGA4()?.event(name, data)
}

export function useHandleUiEvents() {
	return trackEvent
}

export function SignedOutAnalytics() {
	useEffect(() => {
		configurePosthog({ optedIn: false })
		configureGA4({ optedIn: false })
		window.Reo?.reset?.()
	}, [])

	useTrackPageViews()

	return null
}

declare global {
	interface Window {
		Reo: any
	}
}
function setupReo(options: AnalyticsOptions) {
	if (options.optedIn === false) return

	const user = options.user
	const reoIdentify = () =>
		window.Reo?.identify?.({
			firstname: user.name,
			username: user.email,
			type: 'email',
			userId: user.id,
		})
	if (!document.getElementById('reo-script-loader')) {
		const reoId = '47839e47a5ed202'
		const reoScriptTag = document.createElement('script')
		reoScriptTag.id = 'reo-script-loader'
		reoScriptTag.src = `https://static.reo.dev/${reoId}/reo.js`
		reoScriptTag.defer = true
		reoScriptTag.onload = () => {
			window.Reo.init({ clientID: reoId })
			reoIdentify()
		}
		document.head.appendChild(reoScriptTag)
	} else {
		reoIdentify()
	}
}

export function SignedInAnalytics() {
	const app = useApp()
	const user = useValue('userData', () => app.getUser(), [app])

	useEffect(() => {
		configurePosthog({
			optedIn: user.allowAnalyticsCookie === true,
			user: { id: user.id, name: user.name, email: user.email },
		})
		configureGA4({
			optedIn: user.allowAnalyticsCookie === true,
			user: { id: user.id, name: user.name, email: user.email },
		})
		setupReo({
			optedIn: user.allowAnalyticsCookie === true,
			user: { id: user.id, name: user.name, email: user.email },
		})
	}, [user.allowAnalyticsCookie, user.email, user.id, user.name])

	useTrackPageViews()

	return null
}

function useTrackPageViews() {
	const location = useLocation()
	useEffect(() => {
		trackEvent('$pageview')
	}, [location])
}
