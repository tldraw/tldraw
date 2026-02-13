import _posthog from 'posthog-js'
import { POSTHOG_API_HOST, POSTHOG_TOKEN, POSTHOG_UI_HOST } from '../constants'
import { AnalyticsService } from './analytics-service'

class PosthogAnalyticsService extends AnalyticsService {
	override initialize() {
		// Make posthog available globally
		if (typeof window !== 'undefined') {
			window.posthog = _posthog
		}

		_posthog.init(POSTHOG_TOKEN, {
			api_host: POSTHOG_API_HOST,
			ui_host: POSTHOG_UI_HOST,
			capture_pageview: 'history_change',
			cookieless_mode: 'on_reject',
		})
	}

	override enable() {
		if (this.isEnabled) return
		_posthog.opt_in_capturing()
		this.isEnabled = true
	}

	override disable() {
		if (!this.isEnabled) return
		_posthog.setPersonProperties({ analytics_consent: false })
		_posthog.opt_out_capturing()
		this.isEnabled = false
	}

	override identify(userId: string, properties?: { [key: string]: any }) {
		_posthog.identify(userId, {
			...properties,
			analytics_consent: true,
		})
	}

	override reset() {
		_posthog.reset()
	}

	override trackEvent(name: string, data?: { [key: string]: any }) {
		_posthog.capture(name, data)
	}

	override trackPageview() {
		_posthog.capture('$pageview')
	}
}

export const posthogService = new PosthogAnalyticsService()
