import { AnalyticsService } from './services/analytics-service'
import { ga4Gtag, googleAnalytics } from './services/ga4'
import { hubspot } from './services/hubspot'
import { posthog } from './services/posthog'
import { reo } from './services/reo'
import './styles.css'
import type { CookieConsent } from './types'

let isInitialized = false

const ANALYTICS_SERVICES: AnalyticsService[] = [posthog, googleAnalytics, hubspot, reo]

const inMemoryAnalyticsState = {
	userId: '' as string,
	properties: {} as { [key: string]: any } | undefined,
	hasConsent: 'unknown' as CookieConsent,
}

// Identify the user across all analytics services
export function identify(userId: string, properties?: { [key: string]: any }) {
	inMemoryAnalyticsState.userId = userId
	inMemoryAnalyticsState.properties = properties

	if (inMemoryAnalyticsState.hasConsent !== 'opted-in') return

	for (const service of ANALYTICS_SERVICES) {
		service.identify(userId, properties)
	}
}

// Apply consent and either enable or disable the analytics services
export function applyConsent(consent: CookieConsent) {
	inMemoryAnalyticsState.hasConsent = consent

	if (!isInitialized) {
		// Initialize the analytics services (they should have their own
		// logic to check if they are already initialized, too), but okay
		for (const service of ANALYTICS_SERVICES) {
			service.initialize()
		}
		isInitialized = true
	}

	if (consent === 'opted-in') {
		// Enable the analytics services
		for (const service of ANALYTICS_SERVICES) {
			service.enable()
		}

		// Identify the user
		identify(inMemoryAnalyticsState.userId, inMemoryAnalyticsState.properties)
	} else {
		// Disable the analytics services
		for (const service of ANALYTICS_SERVICES) {
			service.disable()
		}
	}
}

// Track a pageview across all analytics services
export function page() {
	for (const service of ANALYTICS_SERVICES) {
		service.trackPageview()
	}
}

// Track an event across all analytics services
export function track(name: string, data?: { [key: string]: any }) {
	for (const service of ANALYTICS_SERVICES) {
		service.trackEvent(name, data)
	}
}

// Direct access to Google Analytics gtag function
export function gtag(...args: any[]) {
	if (inMemoryAnalyticsState.hasConsent !== 'opted-in') return
	ga4Gtag(...args)
}
