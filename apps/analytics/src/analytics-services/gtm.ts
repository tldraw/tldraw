import { GTM_NOSCRIPT_ID, GTM_SCRIPT_ID } from '../constants'
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

		dataLayerPush({
			event: 'consent_default',
			consent: {
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				analytics_storage: 'denied',
				wait_for_update: 500,
			},
		})

		// Load the GTM script
		const script = document.createElement('script')
		script.async = true
		script.id = GTM_SCRIPT_ID
		script.src = `https://www.googletagmanager.com/gtm.js?id=${this.gtmContainerId}`

		const firstScript = document.getElementsByTagName('script')[0]
		if (firstScript?.parentNode) {
			firstScript.parentNode.insertBefore(script, firstScript)
		} else {
			document.head.appendChild(script)
		}

		// Add noscript iframe
		const noscript = document.createElement('noscript')
		noscript.id = GTM_NOSCRIPT_ID
		const iframe = document.createElement('iframe')
		iframe.src = `https://www.googletagmanager.com/ns.html?id=${this.gtmContainerId}`
		iframe.height = '0'
		iframe.width = '0'
		iframe.style.display = 'none'
		iframe.style.visibility = 'hidden'
		noscript.appendChild(iframe)
		document.body.insertBefore(noscript, document.body.firstChild)
	}

	override dispose() {
		const script = document.getElementById(GTM_SCRIPT_ID)
		if (script) script.remove()

		const noscript = document.getElementById(GTM_NOSCRIPT_ID)
		if (noscript) noscript.remove()
	}

	override enable() {
		if (this.isEnabled) return
		dataLayerPush({
			event: 'consent_update',
			consent: {
				ad_user_data: 'granted',
				ad_personalization: 'granted',
				ad_storage: 'granted',
				analytics_storage: 'granted',
			},
		})
		this.isEnabled = true
	}

	override disable() {
		if (!this.isEnabled) return
		dataLayerPush({
			event: 'consent_update',
			consent: {
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				ad_storage: 'denied',
				analytics_storage: 'denied',
			},
		})
		this.isEnabled = false
	}

	override identify(userId: string, properties?: { [key: string]: any }) {
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

	override trackConsentBannerSelected(data: {
		consent_analytics: 'granted' | 'denied'
		consent_marketing: 'granted' | 'denied'
		consent_opt_in_type: 'manual' | 'auto'
	}) {
		dataLayerPush({
			event: 'select_consent_banner',
			id: crypto.randomUUID(),
			data,
		})
	}
}

export const gtmService = new GTMAnalyticsService()
