import { CommonRoomTracker } from '../../../../internal/shared/common-room-tracker'
import { AnalyticsService } from './analytics-service'

class CommonRoomAnalyticsService extends AnalyticsService {
	private configured = false
	private tracker = new CommonRoomTracker()

	override initialize() {
		this.configured = window.TL_COMMON_ROOM_ENABLED === true
	}

	override enable() {
		if (!this.configured || this.isEnabled) return
		this.isEnabled = this.tracker.enable({ watchPageChanges: true })
	}

	override disable() {
		this.tracker.disable()
		this.isEnabled = false
	}

	override dispose() {
		this.disable()
	}

	override identify(_userId: string, properties?: { [key: string]: any }) {
		if (!this.isEnabled || typeof properties?.email !== 'string') return
		this.tracker.identify({ email: properties.email, name: properties.name })
	}

	override reset() {
		if (!this.isEnabled) return
		this.disable()
		this.enable()
	}

	override trackPageview() {
		this.tracker.page()
	}

	override trackFormSubmission(data: {
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
		if (!this.isEnabled || !data.user_email) return
		const name = [data.user_first_name, data.user_last_name].filter(Boolean).join(' ')
		this.tracker.form({ email: data.user_email, name: name || undefined })
	}
}

export const commonRoomService = new CommonRoomAnalyticsService()
