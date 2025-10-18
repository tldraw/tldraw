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
