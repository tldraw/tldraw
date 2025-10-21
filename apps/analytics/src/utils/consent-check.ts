/**
 * Checks if consent is required based on CloudFlare geolocation headers
 *
 *  @returns Promise<boolean> - true if explicit consent is required, false ONLY if confident it's not
 */
export async function shouldRequireConsent(): Promise<boolean> {
	// CloudFlare provides the CF-IPCountry header on all requests
	// Our consent worker checks this and returns whether consent is required
	try {
		const response = await fetch('https://tldraw-consent.workers.dev', {
			// Use a short timeout to avoid delaying the page load
			signal: AbortSignal.timeout(2000),
		})
		if (response.ok) {
			const data = await response.json()
			// Worker returns { requires_consent: boolean, country_code: string }
			if (typeof data.requires_consent === 'boolean') {
				return data.requires_consent
			}
		}
	} catch (error) {
		// Fetch failed or timed out - will default to requiring consent
		console.warn('Consent check failed, defaulting to requiring consent:', error)
	}

	// Conservative default: require consent
	return true
}
