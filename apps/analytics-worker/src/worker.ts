/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

/**
 * Simple CloudFlare worker that returns whether the user requires cookie consent
 * based on their geographic location (via CF-IPCountry header)
 */

/**
 * Validates if an origin is allowed to make cross-origin requests.
 * Returns the origin if allowed, or undefined if blocked.
 */
function isAllowedOrigin(origin: string | null): string | undefined {
	if (!origin) return undefined
	if (origin === 'http://localhost:3000') return origin
	if (origin === 'http://localhost:3001') return origin
	if (origin === 'http://localhost:5420') return origin
	if (origin === 'https://meet.google.com') return origin
	if (origin === 'https://tldraw.dev') return origin
	if (origin.endsWith('.tldraw.com')) return origin
	if (origin.endsWith('.tldraw.dev')) return origin
	if (origin.endsWith('.tldraw.club')) return origin
	if (origin.endsWith('.tldraw.xyz')) return origin
	if (origin.endsWith('.tldraw.workers.dev')) return origin
	if (origin.endsWith('-tldraw.vercel.app')) return origin
	return undefined
}

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
		const origin = request.headers.get('origin')
		const allowedOrigin = isAllowedOrigin(origin)

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			const headers: Record<string, string> = {
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
				'Access-Control-Max-Age': '86400',
			}
			if (allowedOrigin) {
				headers['Access-Control-Allow-Origin'] = allowedOrigin
			}
			return new Response(null, { headers })
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
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
		}
		if (allowedOrigin) {
			headers['Access-Control-Allow-Origin'] = allowedOrigin
		}

		return new Response(
			JSON.stringify({
				requires_consent: requiresConsent,
				country_code: countryCode,
			}),
			{ headers }
		)
	},
}
