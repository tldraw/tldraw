import {
	disableGA4,
	enableGA4,
	ga4Gtag,
	identifyGA4,
	initializeGA4,
	trackGA4Event,
	trackGA4Pageview,
} from './ga4'
import {
	disablePostHog,
	enablePostHog,
	identifyPostHog,
	initializePostHog,
	trackPostHogEvent,
	trackPostHogPageview,
} from './posthog'
import { identifyReo, loadHubspotScript, loadReoScript, resetReo } from './reo'
import './styles.css'
import type { CookieConsent } from './types'

let isConfigured = false
let storedUserId: string = ''
let storedProperties: { [key: string]: any } | undefined = undefined
let storedHasConsent: CookieConsent = 'unknown'

function ensureAnalyticsConfigured() {
	if (isConfigured) return

	initializePostHog()
	initializeGA4()

	isConfigured = true
}

function enableAnalytics() {
	enablePostHog()
	enableGA4()

	if (storedUserId && storedProperties) {
		identify(storedUserId, storedProperties)
	}

	loadHubspotScript()
	loadReoScript()
}

function disableAnalytics() {
	disablePostHog()
	disableGA4()
	resetReo()
}

export function applyConsent(consent: CookieConsent) {
	storedHasConsent = consent
	ensureAnalyticsConfigured()

	if (consent === 'opted-in') {
		enableAnalytics()
		return
	}

	disableAnalytics()
}

export function page() {
	trackPostHogPageview()
	trackGA4Pageview()
}

export function identify(userId: string, properties?: { [key: string]: any }) {
	storedUserId = userId
	storedProperties = properties

	if (storedHasConsent !== 'opted-in') return

	identifyPostHog(userId, properties)
	identifyGA4(userId, properties)
	identifyReo(userId, properties)
}

export function track(name: string, data?: { [key: string]: any }) {
	trackPostHogEvent(name, data)
	trackGA4Event(name, data)
}

export function gtag(...args: any[]) {
	if (storedHasConsent !== 'opted-in') return
	ga4Gtag(...args)
}
