/* eslint-disable @typescript-eslint/no-unused-vars */

export class AnalyticsService {
	protected isInitialized = false
	protected isEnabled = false
	// Initialize the service regardless of cookie consent.
	initialize(): void {}
	// Enable the service when cookie consent is granted.
	enable(): void {}
	// Disable the service when cookie consent is revoked.
	disable(): void {}
	// Identify the user.
	identify(userId: string, properties?: { [key: string]: any }): void {}
	// Track an event.
	trackEvent(name: string, data?: { [key: string]: any }): void {}
	// Track a pageview.
	trackPageview(): void {}
}
