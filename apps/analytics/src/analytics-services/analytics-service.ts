/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConsentPreferences } from '../types'

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
	// Track when consent banner is displayed (called before consent is granted).
	trackConsentBannerDisplayed?(data: { consent_opt_in_type: 'manual' | 'auto' }): void
	// Track when user selects consent preferences (called before consent is granted).
	trackConsentBannerSelected?(data: ConsentPreferences): void
	// Track when user copies a code snippet.
	trackCopyCode?(data: {
		page_category: string
		text_snippet: string
		user_email?: string
		user_email_sha256?: string
		user_first_name?: string
		user_last_name?: string
		user_phone_number?: string
	}): void
	// Track when user submits a form.
	trackFormSubmission?(data: {
		enquiry_type: string
		page_category?: string
		company_size?: string
		company_website?: string
		user_email?: string
		user_email_sha256?: string
		user_first_name?: string
		user_last_name?: string
		user_phone_number?: string
	}): void
}
