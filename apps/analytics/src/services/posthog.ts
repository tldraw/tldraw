import _posthog from 'posthog-js'
import { POSTHOG_API_HOST, POSTHOG_TOKEN, POSTHOG_UI_HOST } from '../constants'
import { AnalyticsService } from './analytics-service'

// Make posthog available globally
// ? In other places we check whether the window is available... should we do this in initialize?
window.posthog = _posthog

class PosthogAnalyticsService extends AnalyticsService {
	override initialize() {
		if (this.isInitialized) return
		_posthog.init(POSTHOG_TOKEN, {
			api_host: POSTHOG_API_HOST,
			ui_host: POSTHOG_UI_HOST,
		})
	}
	override enable() {
		_posthog.set_config({ persistence: 'localStorage+cookie' })
		_posthog.opt_in_capturing()
	}
	override disable() {
		_posthog.setPersonProperties({ analytics_consent: false })
		_posthog.reset()
		_posthog.set_config({ persistence: 'memory' })
		_posthog.opt_out_capturing()
	}
	override identify(userId: string, properties?: { [key: string]: any }) {
		_posthog.identify(userId, {
			...properties,
			analytics_consent: true,
		})
	}
	override trackEvent(name: string, data?: { [key: string]: any }) {
		_posthog.capture(name, data)
	}
	override trackPageview() {
		_posthog.capture('$pageview')
	}
}

export const posthog = new PosthogAnalyticsService()
