import posthog from 'posthog-js'
import 'posthog-js/dist/web-vitals'

// @ts-ignore this is fine
const POSTHOG_KEY: string | undefined = import.meta.env.VITE_POSTHOG_KEY
const shouldUsePosthog = POSTHOG_KEY !== undefined

let isInitialized = false

function initializePosthog() {
	if (!shouldUsePosthog) return
	if (isInitialized) return

	console.log('initialize posthog with default settings')
	posthog.init(POSTHOG_KEY, {
		api_host: '/api/ph',
		capture_pageview: false,
		persistence: 'memory',
	})

	isInitialized = true
}

function getPosthog() {
	if (!shouldUsePosthog) return null
	if (!isInitialized) initializePosthog()
	return posthog
}

export function trackPosthogEvent(name: string, data?: { [key: string]: any }) {
	getPosthog()?.capture(name, data)
}
