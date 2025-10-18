import posthog from 'posthog-js'

let isInitialized = false

// Make posthog available globally
window.posthog = posthog

export function initializePostHog() {
	if (isInitialized) return

	posthog.init('phc_i8oKgMzgV38sn3GfjswW9mevQ3gFlo7bJXekZFeDN6', {
		api_host: 'https://analytics.tldraw.com/i',
		ui_host: 'https://eu.i.posthog.com',
		persistence: 'memory',
		capture_pageview: 'history_change',
	})

	isInitialized = true
}

export function enablePostHog() {
	posthog.set_config({ persistence: 'localStorage+cookie' })
	posthog.opt_in_capturing()
}

export function disablePostHog() {
	posthog.setPersonProperties({ analytics_consent: false })
	posthog.reset()
	posthog.set_config({ persistence: 'memory' })
	posthog.opt_out_capturing()
}

export function identifyPostHog(userId: string, properties?: { [key: string]: any }) {
	posthog.identify(userId, {
		...properties,
		analytics_consent: true,
	})
}

export function trackPostHogEvent(name: string, data?: { [key: string]: any }) {
	posthog.capture(name, data)
}

export function trackPostHogPageview() {
	posthog.capture('$pageview')
}
