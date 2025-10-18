import ReactGA from 'react-ga4'

let isInitialized = false

export function initializeGA4() {
	if (isInitialized) return
	if (!window.TL_GA4_MEASUREMENT_ID) return

	ReactGA.gtag('consent', 'default', {
		ad_storage: 'denied',
		ad_user_data: 'denied',
		ad_personalization: 'denied',
		analytics_storage: 'denied',
		// Wait for our cookie to load.
		wait_for_update: 500,
	})

	ReactGA.initialize(window.TL_GA4_MEASUREMENT_ID, {
		gaOptions: {
			anonymize_ip: true,
		},
	})

	if (window.TL_GOOGLE_ADS_ID) {
		ReactGA.gtag('config', window.TL_GOOGLE_ADS_ID)
	}

	isInitialized = true
}

export function enableGA4() {
	ReactGA.set({ anonymize_ip: false })
	ReactGA.gtag('consent', 'update', {
		ad_user_data: 'granted',
		ad_personalization: 'granted',
		ad_storage: 'granted',
		analytics_storage: 'granted',
	})
}

export function disableGA4() {
	ReactGA.reset()
	ReactGA.set({ anonymize_ip: true })
	ReactGA.gtag('consent', 'update', {
		ad_user_data: 'denied',
		ad_personalization: 'denied',
		ad_storage: 'denied',
		analytics_storage: 'denied',
	})
}

export function identifyGA4(userId: string, properties?: { [key: string]: any }) {
	ReactGA.set({ userId })
	if (properties) {
		ReactGA.set(properties)
	}
}

export function trackGA4Event(name: string, data?: { [key: string]: any }) {
	ReactGA.event(name, data)
}

export function trackGA4Pageview() {
	ReactGA.send('pageview')
}

export function ga4Gtag(...args: any[]) {
	// @ts-ignore - ReactGA.gtag accepts variable arguments
	ReactGA.gtag(...args)
}
