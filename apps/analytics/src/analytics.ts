import { ga4Gtag, googleAnalytics } from './ga4'
import { hubspot } from './hubspot'
import { posthog } from './posthog'
import { reo } from './reo'
import './styles.css'
import type { AnalyticsService, CookieConsent } from './types'

let isConfigured = false

const inMemoryAnalyticsState = {
	userId: '' as string,
	properties: {} as { [key: string]: any } | undefined,
	hasConsent: 'unknown' as CookieConsent,
}

const analyticsServices: AnalyticsService[] = [posthog, googleAnalytics, hubspot, reo]

function ensureAnalyticsConfigured() {
	if (isConfigured) return

	for (const service of analyticsServices) {
		service.initialize()
	}

	isConfigured = true
}

function enableAnalytics() {
	for (const service of analyticsServices) {
		service.enable()
	}

	if (inMemoryAnalyticsState.userId && inMemoryAnalyticsState.properties) {
		identify(inMemoryAnalyticsState.userId, inMemoryAnalyticsState.properties)
	}
}

function disableAnalytics() {
	for (const service of analyticsServices) {
		service.disable()
	}
}

export function page() {
	for (const service of analyticsServices) {
		service.trackPageview()
	}
}

export function identify(userId: string, properties?: { [key: string]: any }) {
	inMemoryAnalyticsState.userId = userId
	inMemoryAnalyticsState.properties = properties

	if (inMemoryAnalyticsState.hasConsent !== 'opted-in') return

	for (const service of analyticsServices) {
		service.identify(userId, properties)
	}
}

export function track(name: string, data?: { [key: string]: any }) {
	for (const service of analyticsServices) {
		service.trackEvent(name, data)
	}
}

export function gtag(...args: any[]) {
	if (inMemoryAnalyticsState.hasConsent !== 'opted-in') return
	ga4Gtag(...args)
}

export function applyConsent(consent: CookieConsent) {
	inMemoryAnalyticsState.hasConsent = consent
	ensureAnalyticsConfigured()

	if (consent === 'opted-in') enableAnalytics()
	else disableAnalytics()
}
