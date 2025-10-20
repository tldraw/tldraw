/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

/**
 * Simple CloudFlare worker that returns whether the user requires cookie consent
 * based on their geographic location (via CF-IPCountry header)
 */

const EXPLICIT_CONSENT_COUNTRIES = [
	// EU Member States (GDPR)
	'AT',
	'BE',
	'BG',
	'HR',
	'CY',
	'CZ',
	'DK',
	'EE',
	'FI',
	'FR',
	'DE',
	'GR',
	'HU',
	'IE',
	'IT',
	'LV',
	'LT',
	'LU',
	'MT',
	'NL',
	'PL',
	'PT',
	'RO',
	'SK',
	'SI',
	'ES',
	'SE',
	// EEA/EFTA (GDPR)
	'IS',
	'LI',
	'NO',
	// Post-Brexit UK (UK PECR)
	'GB',
	// Switzerland (FADP)
	'CH',
	// Brazil (LGPD)
	'BR',
]

export default {
	async fetch(request: Request): Promise<Response> {
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
					'Access-Control-Max-Age': '86400',
				},
			})
		}

		// Only allow GET requests
		if (request.method !== 'GET') {
			return new Response('Method not allowed', { status: 405 })
		}

		// Get country code from CloudFlare header
		const countryCode = request.headers.get('CF-IPCountry')

		// Check if consent is required
		// Default to requiring consent if country is unknown
		const requiresConsent = !countryCode || EXPLICIT_CONSENT_COUNTRIES.includes(countryCode)

		// Return response with CORS headers
		return new Response(
			JSON.stringify({
				requires_consent: requiresConsent,
				country_code: countryCode,
			}),
			{
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
				},
			}
		)
	},
}
