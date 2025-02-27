import posthog, { PostHogConfig, Properties } from 'posthog-js'
import 'posthog-js/dist/web-vitals'
import { useEffect } from 'react'
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

let currentOptions: AnalyticsOptions | null = null

function configurePosthog(options: AnalyticsOptions) {
	if (!shouldUsePosthog) return

	const config: Partial<PostHogConfig> = {
		api_host: '/api/ph',
		capture_pageview: false,
		persistence: options.optedIn ? 'localStorage+cookie' : 'memory',
		before_send: (payload) => {
			if (!payload) return null
			payload.properties.is_signed_in = !!options.user
			return payload
		},
	}
	if (!currentOptions) {
		posthog.init(POSTHOG_KEY, config)
	}

	if (options.optedIn) {
		posthog.identify(options.user.id, {
			email: options.user.email,
			name: options.user.name,
		})
	} else if (currentOptions?.optedIn) {
		posthog.reset()
	}

	posthog.set_config(config)
	currentOptions = options
	eventBuffer?.forEach((event) => posthog.capture(event.name, event.data))
	eventBuffer = null
}

let eventBuffer: null | Array<{ name: string; data: Properties | null | undefined }> = []

function getPosthog() {
	if (!shouldUsePosthog) return null
	if (!currentOptions) {
		warnOnce('getPosthog called before configurePosthog - buffering')
		return {
			capture(name: string, data: Properties | null | undefined) {
				eventBuffer?.push({ name, data })
			},
		}
	}
	return posthog
}

export function trackPosthogEvent(name: string, data?: { [key: string]: any }) {
	getPosthog()?.capture(name, data)
}

export function SignedOutPosthog() {
	useEffect(() => {
		configurePosthog({ optedIn: false })
	}, [])

	useTrackPageViews()

	return null
}

export function SignedInPosthog() {
	const app = useApp()
	const user = useValue('userData', () => app.getUser(), [app])

	useEffect(() => {
		configurePosthog({
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
		trackPosthogEvent('$pageview')
	}, [location])
}
