import { AnalyticsService } from './types'

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

// Load the GA4 script
function loadGA4Script(measurementId: string) {
	if (typeof window === 'undefined') return

	// Initialize dataLayer
	window.dataLayer = window.dataLayer || []
	window.gtag = function (...args: any[]) {
		window.dataLayer!.push(...args)
	}
	gtag('js', new Date())

	// Load the GA4 script
	const script = document.createElement('script')
	script.async = true
	script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
	document.head.appendChild(script)
}

let measurementId: string | undefined
let googleAdsId: string | undefined

export const googleAnalytics: AnalyticsService = {
	_isInitialized: false,
	initialize() {
		if (this._isInitialized) return

		if (typeof window !== 'undefined') {
			measurementId = window.TL_GA4_MEASUREMENT_ID ?? undefined
			googleAdsId = window.TL_GOOGLE_ADS_ID ?? undefined
		}

		if (measurementId) {
			gtag('consent', 'default', {
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				analytics_storage: 'denied',
				// Wait for our cookie to load.
				wait_for_update: 500,
			})

			loadGA4Script(measurementId)

			gtag('config', measurementId, {
				anonymize_ip: true,
			})
		}

		if (googleAdsId) {
			gtag('config', googleAdsId)
		}

		this._isInitialized = true
	},
	enable() {
		gtag('set', { anonymize_ip: false })
		gtag('consent', 'update', {
			ad_user_data: 'granted',
			ad_personalization: 'granted',
			ad_storage: 'granted',
			analytics_storage: 'granted',
		})
	},
	disable() {
		// Clear user properties
		if (measurementId) {
			gtag('config', measurementId, {
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
	},
	identify(userId: string, properties?: { [key: string]: any }) {
		gtag('set', { user_id: userId })
		if (properties) {
			gtag('set', properties)
		}
	},
	trackEvent(name: string, data?: { [key: string]: any }) {
		gtag('event', name, data)
	},
	trackPageview() {
		gtag('event', 'page_view')
	},
}

export function ga4Gtag(...args: any[]) {
	gtag(...args)
}
