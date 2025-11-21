import { GTM_SCRIPT_ID } from '../constants'
import { ConsentPreferences } from '../types'
import { AnalyticsService } from './analytics-service'

// Extend Window with dataLayer (other Window properties declared in types.ts)
declare global {
	interface Window {
		dataLayer?: any[]
	}
}

// Helper to safely push to dataLayer (internal use only)
function dataLayerPush(data: any) {
	if (typeof window !== 'undefined' && window.dataLayer) {
		window.dataLayer.push(data)
	}
}

class GTMAnalyticsService extends AnalyticsService {
	private gtmContainerId: string | undefined

	override initialize() {
		if (typeof window === 'undefined') return

		this.gtmContainerId = window.TL_GTM_CONTAINER_ID ?? undefined

		if (!this.gtmContainerId) return

		// Set default consent state
		window.dataLayer = window.dataLayer || []
		dataLayerPush({
			'gtm.start': new Date().getTime(),
			event: 'gtm.js',
		})

		// Load the GTM script
		const script = document.createElement('script')
		script.async = true
		script.id = GTM_SCRIPT_ID
		script.src = `https://www.googletagmanager.com/gtm.js?id=${this.gtmContainerId}`
		document.head.appendChild(script)
	}

	override dispose() {
		const script = document.getElementById(GTM_SCRIPT_ID)
		if (script) script.remove()
	}

	override enable() {
		this.isEnabled = true
	}

	override disable() {
		this.isEnabled = false
	}

	override identify(userId: string, properties?: { [key: string]: any }) {
		if (!this.isEnabled) return
		dataLayerPush({
			event: 'user_identify',
			user_id: userId,
			user_properties: properties,
		})
	}

	override trackEvent(name: string, data?: { [key: string]: any }) {
		dataLayerPush({
			event: name,
			...data,
		})
	}

	override trackPageview() {
		dataLayerPush({
			event: 'page_view',
		})
	}

	override trackConsentBannerDisplayed(data: { consent_opt_in_type: 'manual' | 'auto' }) {
		dataLayerPush({
			event: 'display_consent_banner',
			id: crypto.randomUUID(),
			data,
		})
	}

	override trackConsentBannerSelected(data: ConsentPreferences) {
		dataLayerPush({
			event: 'select_consent_banner',
			id: crypto.randomUUID(),
			data,
		})
	}

	override trackCopyCode(data: {
		page_category: string
		text_snippet: string
		user_email?: string
		user_email_sha256?: string
		user_first_name?: string
		user_last_name?: string
		user_phone_number?: string
	}) {
		const payload: any = {
			event: 'click_copy_code',
			id: crypto.randomUUID(),
			page: {
				category: data.page_category.toLowerCase(),
			},
			data: {
				text_snippet: data.text_snippet.substring(0, 100),
			},
			_clear: true,
		}

		// Only include user object if we have user data
		if (
			data.user_email ||
			data.user_email_sha256 ||
			data.user_first_name ||
			data.user_last_name ||
			data.user_phone_number
		) {
			payload.user = {}
			if (data.user_email) payload.user.email = data.user_email.toLowerCase()
			if (data.user_email_sha256) payload.user.email_sha256 = data.user_email_sha256.toLowerCase()
			if (data.user_first_name) payload.user.first_name = data.user_first_name.toLowerCase()
			if (data.user_last_name) payload.user.last_name = data.user_last_name.toLowerCase()
			if (data.user_phone_number) payload.user.phone_number = data.user_phone_number
		}

		dataLayerPush(payload)
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
		const payload: any = {
			event: 'generate_lead',
			id: crypto.randomUUID(),
			page: {
				category: (data.page_category || 'enquiry').toLowerCase(),
			},
			data: {
				enquiry_type: data.enquiry_type.toLowerCase(),
			},
			_clear: true,
		}

		// Add optional company data
		if (data.company_size) payload.data.company_size = data.company_size.toLowerCase()
		if (data.company_website) payload.data.company_website = data.company_website.toLowerCase()

		// Only include user object if we have user data
		if (
			data.user_email ||
			data.user_email_sha256 ||
			data.user_first_name ||
			data.user_last_name ||
			data.user_phone_number
		) {
			payload.user = {}
			if (data.user_email) payload.user.email = data.user_email.toLowerCase()
			if (data.user_email_sha256) payload.user.email_sha256 = data.user_email_sha256.toLowerCase()
			if (data.user_first_name) payload.user.first_name = data.user_first_name.toLowerCase()
			if (data.user_last_name) payload.user.last_name = data.user_last_name.toLowerCase()
			if (data.user_phone_number) payload.user.phone_number = data.user_phone_number
		}

		dataLayerPush(payload)
	}
}

export const gtmService = new GTMAnalyticsService()
