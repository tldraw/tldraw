import { AnalyticsService } from './analytics-service'

// Extend Window with gtag and dataLayer (other Window properties declared in types.ts)
declare global {
	interface Window {
		gtag?(...args: any[]): void
		dataLayer?: any[]
	}
}

// Helper to safely call gtag
function gtag(...args: any[]) {
	if (typeof window !== 'undefined' && window.gtag) {
		window.gtag(...args)
	}
}

export function ga4Gtag(...args: any[]) {
	gtag(...args)
}

class GA4AnalyticsService extends AnalyticsService {
	private measurementId: string | undefined
	private googleAdsId: string | undefined

	override initialize() {
		if (typeof window === 'undefined') return

		this.measurementId = window.TL_GA4_MEASUREMENT_ID ?? undefined
		this.googleAdsId = window.TL_GOOGLE_ADS_ID ?? undefined

		if (this.measurementId) {
			gtag('consent', 'default', {
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				analytics_storage: 'denied',
				// Wait for our cookie to load.
				wait_for_update: 500,
			})

			// Initialize dataLayer
			window.dataLayer = window.dataLayer || []
			window.gtag = function () {
				// eslint-disable-next-line prefer-rest-params
				window.dataLayer!.push(arguments)
			}
			gtag('js', new Date())

			// Load the GA4 script
			const script = document.createElement('script')
			script.async = true
			script.id = `gtag-${this.measurementId}`
			script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`
			document.head.appendChild(script)

			gtag('config', this.measurementId, {
				anonymize_ip: true,
			})
		}

		if (this.googleAdsId) {
			gtag('config', this.googleAdsId)
		}
	}

	override dispose() {
		const script = document.getElementById(`gtag-${this.measurementId}`)
		if (script) script.remove()
	}

	override enable() {
		if (this.isEnabled) return
		gtag('set', { anonymize_ip: false })
		gtag('consent', 'update', {
			ad_user_data: 'granted',
			ad_personalization: 'granted',
			ad_storage: 'granted',
			analytics_storage: 'granted',
		})
		this.isEnabled = true
	}

	override disable() {
		if (!this.isEnabled) return
		// Clear user properties
		if (this.measurementId) {
			gtag('config', this.measurementId, {
				client_id: undefined,
				user_id: undefined,
			})
		}
		gtag('set', { anonymize_ip: true })
		gtag('consent', 'update', {
			ad_user_data: 'denied',
			ad_personalization: 'denied',
			ad_storage: 'denied',
			analytics_storage: 'denied',
		})
		this.isEnabled = false
	}

	override identify(userId: string, properties?: { [key: string]: any }) {
		gtag('set', { user_id: userId })
		if (properties) {
			gtag('set', properties)
		}
	}

	override trackEvent(name: string, data?: { [key: string]: any }) {
		gtag('event', name, data)
	}

	override trackPageview() {
		gtag('event', 'page_view')
	}
}

export const ga4Service = new GA4AnalyticsService()
