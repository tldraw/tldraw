/* eslint-disable @typescript-eslint/no-unused-vars */

export class AnalyticsService {
	protected isEnabled = false
	// Initialize the service (regardless of cookie consent)
	initialize(): void {}
	// Clean up the service.
	dispose(): void {}
	// Enable the service when cookie consent is granted.
	enable(): void {}
	// Disable the service when cookie consent is revoked.
	disable(): void {}
	// Identify the user.
	identify(userId: string, properties?: { [key: string]: any }): void {}
	// Reset the user identity (call on logout).
	reset(): void {}
	// Track an event.
	trackEvent(name: string, data?: { [key: string]: any }): void {}
	// Track a pageview.
	trackPageview(): void {}
}
