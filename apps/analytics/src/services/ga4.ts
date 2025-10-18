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

class GoogleAnalyticsService extends AnalyticsService {
	private measurementId: string | undefined
	private googleAdsId: string | undefined

	override initialize() {
		if (this.isInitialized) return

		if (typeof window !== 'undefined') {
			this.measurementId = window.TL_GA4_MEASUREMENT_ID ?? undefined
			this.googleAdsId = window.TL_GOOGLE_ADS_ID ?? undefined
		}

		if (this.measurementId) {
			gtag('consent', 'default', {
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				analytics_storage: 'denied',
				// Wait for our cookie to load.
				wait_for_update: 500,
			})

			if (typeof window !== 'undefined') {
				// Initialize dataLayer
				window.dataLayer = window.dataLayer || []
				window.gtag = function (...args: any[]) {
					window.dataLayer!.push(args)
				}
				gtag('js', new Date())

				// Load the GA4 script
				const script = document.createElement('script')
				script.async = true
				script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`
				document.head.appendChild(script)
			}

			gtag('config', this.measurementId, {
				anonymize_ip: true,
			})
		}

		if (this.googleAdsId) {
			gtag('config', this.googleAdsId)
		}

		this.isInitialized = true
	}
	override enable() {
		gtag('set', { anonymize_ip: false })
		gtag('consent', 'update', {
			ad_user_data: 'granted',
			ad_personalization: 'granted',
			ad_storage: 'granted',
			analytics_storage: 'granted',
		})
	}
	override disable() {
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

export const googleAnalytics = new GoogleAnalyticsService()
