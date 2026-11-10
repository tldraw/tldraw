import _posthog from 'posthog-js'
import { POSTHOG_API_HOST, POSTHOG_TOKEN, POSTHOG_UI_HOST } from '../constants'
import { copyEventMetadata, isProspectId, type CopyCodeEvent } from '../utils/copy-event'
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

	override trackCopyCode(data: CopyCodeEvent) {
		_posthog.capture('click_copy_code', copyEventMetadata(data))
	}

	override trackFormSubmission(data: {
		prospectId?: string
		enquiry_type: string
		page_category?: string
		company_size?: string
		company_website?: string
		user_email?: string
		user_email_sha256?: string
		user_first_name?: string
		user_last_name?: string
		user_phone_number?: string
	}) {
		// A form is not proof that an existing signed-in account belongs to this email.
		const knownId = _posthog.get_property('$user_id')
		if (
			this.isEnabled &&
			data.user_email &&
			isProspectId(data.prospectId) &&
			(!knownId || knownId === data.prospectId)
		) {
			_posthog.identify(data.prospectId, { email: data.user_email.trim().toLowerCase() })
		}
		_posthog.capture('form submitted', { form: data.enquiry_type })
	}
}

export const posthogService = new PosthogAnalyticsService()
