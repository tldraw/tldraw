// Expose global functions
declare global {
	interface Window {
		tlanalytics: {
			openPrivacySettings(): void
			page(): void
			identify(userId: string, properties?: { [key: string]: any }): void
			reset(): void
			track(name: string, data?: { [key: string]: any }): void
			gtag(...args: any[]): void
			getConsentState(): ConsentPreferences
			onConsentUpdate(callback: (preferences: ConsentPreferences) => void): () => void
			trackCopyCode(data: {
				page_category: string
				text_snippet: string
				user_email?: string
				user_email_sha256?: string
				user_first_name?: string
				user_last_name?: string
				user_phone_number?: string
			}): void
			trackFormSubmission(data: {
				enquiry_type: string
				company_size?: string
				company_website?: string
				user_email: string
				user_email_sha256: string
				user_first_name: string
				user_last_name: string
				user_phone_number?: string
			}): void
		}
		TL_GA4_MEASUREMENT_ID: string | undefined
		TL_GOOGLE_ADS_ID?: string
		TL_GTM_CONTAINER_ID?: string
		Reo: any
		posthog: any
	}
}

export type CookieConsent = 'unknown' | 'opted-in' | 'opted-out'

export interface ConsentPreferences {
	analytics: 'granted' | 'denied'
	marketing: 'granted' | 'denied'
	opt_in_type: 'manual' | 'auto'
}
