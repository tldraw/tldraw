import _posthog from 'posthog-js'
import { POSTHOG_API_HOST, POSTHOG_TOKEN, POSTHOG_UI_HOST } from './constants'
import { AnalyticsService } from './types'

// Make posthog available globally
window.posthog = _posthog

export const posthog: AnalyticsService = {
	_isInitialized: false,
	initialize() {
		if (this._isInitialized) return

		_posthog.init(POSTHOG_TOKEN, {
			api_host: POSTHOG_API_HOST,
			ui_host: POSTHOG_UI_HOST,
			persistence: 'memory',
			capture_pageview: 'history_change',
		})

		this._isInitialized = true
	},
	enable() {
		_posthog.set_config({ persistence: 'localStorage+cookie' })
		_posthog.opt_in_capturing()
	},
	disable() {
		_posthog.setPersonProperties({ analytics_consent: false })
		_posthog.reset()
		_posthog.set_config({ persistence: 'memory' })
		_posthog.opt_out_capturing()
	},
	identify(userId: string, properties?: { [key: string]: any }) {
		_posthog.identify(userId, {
			...properties,
			analytics_consent: true,
		})
	},
	trackEvent(name: string, data?: { [key: string]: any }) {
		_posthog.capture(name, data)
	},
	trackPageview() {
		_posthog.capture('$pageview')
	},
}
