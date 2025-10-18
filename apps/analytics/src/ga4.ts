import ReactGA from 'react-ga4'
import { AnalyticsService } from './types'

export const googleAnalytics: AnalyticsService = {
	_isInitialized: false,
	initialize() {
		if (this._isInitialized) return
		let measurementId: string | undefined
		let googleAdsId: string | undefined

		if (typeof window !== 'undefined') {
			measurementId = window.TL_GA4_MEASUREMENT_ID ?? undefined
			googleAdsId = window.TL_GOOGLE_ADS_ID ?? undefined
		}

		if (measurementId) {
			ReactGA.gtag('consent', 'default', {
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				analytics_storage: 'denied',
				// Wait for our cookie to load.
				wait_for_update: 500,
			})

			ReactGA.initialize(measurementId, {
				gaOptions: {
					anonymize_ip: true,
				},
			})
		}

		if (googleAdsId) {
			ReactGA.gtag('config', googleAdsId)
		}

		this._isInitialized = true
	},
	enable() {
		ReactGA.set({ anonymize_ip: false })
		ReactGA.gtag('consent', 'update', {
			ad_user_data: 'granted',
			ad_personalization: 'granted',
			ad_storage: 'granted',
			analytics_storage: 'granted',
		})
	},
	disable() {
		ReactGA.reset()
		ReactGA.set({ anonymize_ip: true })
		ReactGA.gtag('consent', 'update', {
			ad_user_data: 'denied',
			ad_personalization: 'denied',
			ad_storage: 'denied',
			analytics_storage: 'denied',
		})
	},
	identify(userId: string, properties?: { [key: string]: any }) {
		ReactGA.set({ userId })
		if (properties) {
			ReactGA.set(properties)
		}
	},
	trackEvent(name: string, data?: { [key: string]: any }) {
		ReactGA.event(name, data)
	},
	trackPageview() {
		ReactGA.send('pageview')
	},
}

export function ga4Gtag(...args: any[]) {
	// @ts-ignore - ReactGA.gtag accepts variable arguments
	ReactGA.gtag(...args)
}
