// Expose global functions
declare global {
	interface Window {
		tlanalytics: {
			openPrivacySettings(): void
			page(): void
			identify(userId: string, properties?: { [key: string]: any }): void
			track(name: string, data?: { [key: string]: any }): void
			gtag(...args: any[]): void
		}
		TL_GA4_MEASUREMENT_ID: string | undefined
		TL_GOOGLE_ADS_ID?: string
		Reo: any
		posthog: any
	}
}

export type CookieConsent = 'unknown' | 'opted-in' | 'opted-out'

export interface InMemoryAnalyticsState {
	userId: string
	properties: { [key: string]: any } | undefined
	hasConsent: CookieConsent
}

export interface AnalyticsService {
	_isInitialized: boolean
	initialize(): void
	enable(): void
	disable(): void
	identify(userId: string, properties?: { [key: string]: any }): void
	trackEvent(name: string, data?: { [key: string]: any }): void
	trackPageview(): void
}
