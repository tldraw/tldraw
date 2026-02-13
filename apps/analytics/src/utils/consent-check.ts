type ConsentCheckResult = 'requires-consent' | 'no-consent-needed'

/**
 * Checks if consent is required based on CloudFlare geolocation headers
 *
 *  @returns Promise<'requires-consent' | 'no-consent-needed'> - 'requires-consent' if explicit consent is required, 'no-consent-needed' if confident it's not
 */
export async function shouldRequireConsent(): Promise<ConsentCheckResult> {
	// CloudFlare provides the CF-IPCountry header on all requests
	// Our consent worker checks this and returns whether consent is required
	try {
		const response = await fetch('https://consent.tldraw.xyz')
		if (response.ok) {
			const data = await response.json()
			// Worker returns { requires_consent: boolean, country_code: string }
			if (typeof data.requires_consent === 'boolean') {
				return data.requires_consent ? 'requires-consent' : 'no-consent-needed'
			}
		}
	} catch (error) {
		// Fetch failed or timed out - will default to requiring consent
		console.warn('Consent check failed, defaulting to requiring consent:', error)
	}

	// Conservative default: require consent
	return 'requires-consent'
}
