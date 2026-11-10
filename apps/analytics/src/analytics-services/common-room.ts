import Cookies from 'js-cookie'
import { CommonRoomTracker } from '../../../../internal/shared/common-room-tracker'
import { copyEventMetadata, isProspectId, type CopyCodeEvent } from '../utils/copy-event'
import { AnalyticsService } from './analytics-service'

const COMMON_ROOM_ENABLED_HOSTNAMES = ['tldraw.dev']

class CommonRoomAnalyticsService extends AnalyticsService {
	private configured = false
	private copyVisitorId: string | undefined
	private generation = 0
	private tracker = new CommonRoomTracker()

	override initialize() {
		this.configured = COMMON_ROOM_ENABLED_HOSTNAMES.includes(window.location.hostname)
	}

	override enable() {
		if (!this.configured || this.isEnabled) return
		this.isEnabled = this.tracker.enable({ watchPageChanges: true })
		if (this.isEnabled) {
			const saved = Cookies.get('tl_copy_visitor')
			this.copyVisitorId = isProspectId(saved) ? saved : crypto.randomUUID()
			Cookies.set('tl_copy_visitor', this.copyVisitorId, {
				expires: 180,
				path: '/',
				sameSite: 'Lax',
				secure: true,
			})
		}
	}

	override disable() {
		if (!this.configured) return
		this.generation++
		this.copyVisitorId = undefined
		Cookies.remove('tl_copy_visitor', { path: '/' })
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
		this.generation++
		this.isEnabled = this.tracker.reset()
		this.copyVisitorId = this.isEnabled ? crypto.randomUUID() : undefined
		Cookies.remove('tl_copy_visitor', { path: '/' })
		if (this.copyVisitorId)
			Cookies.set('tl_copy_visitor', this.copyVisitorId, {
				expires: 180,
				path: '/',
				sameSite: 'Lax',
				secure: true,
			})
	}

	getCopyVisitorId(): string | undefined {
		return this.isEnabled ? this.copyVisitorId : undefined
	}

	override trackCopyCode(data: CopyCodeEvent) {
		const visitorId = this.getCopyVisitorId()
		if (!visitorId) return
		const body = JSON.stringify({
			event: 'click_copy_code',
			visitor_id: visitorId,
			analytics_consent: true,
			...copyEventMetadata(data),
		})
		void this.deliverCopy(body, this.generation)
	}

	private async deliverCopy(body: string, generation: number) {
		for (let attempt = 0; attempt < 3; attempt++) {
			if (!this.isEnabled || generation !== this.generation) return
			try {
				const response = await fetch('/api/website-events', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body,
					keepalive: true,
					signal: AbortSignal.timeout(5000),
				})
				if (response.ok || (response.status < 500 && response.status !== 429)) return
			} catch {
				/* A retry reuses the action ID and its original page and time. */
			}
			if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt))
		}
	}

	override trackPageview() {
		this.tracker.page()
	}

	override trackFormSubmission(data: {
		copyVisitorId?: string
		previousCopyVisitorId?: string
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
		if (isProspectId(data.copyVisitorId) && data.previousCopyVisitorId === this.copyVisitorId) {
			if (this.copyVisitorId !== data.copyVisitorId) {
				this.generation++
				this.tracker.reset()
			}
			this.copyVisitorId = data.copyVisitorId
			Cookies.set('tl_copy_visitor', this.copyVisitorId, {
				expires: 180,
				path: '/',
				sameSite: 'Lax',
				secure: true,
			})
		}
		const name = [data.user_first_name, data.user_last_name].filter(Boolean).join(' ')
		this.tracker.form({ email: data.user_email, name: name || undefined })
	}
}

export const commonRoomService = new CommonRoomAnalyticsService()
