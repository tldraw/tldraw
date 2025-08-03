/**
 * Utility functions for handling UTM parameters to prevent pollution in internal navigation
 */

const UTM_PARAMS = [
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_term',
	'utm_content',
	// Additional marketing parameters that should be cleaned
	'gclid', // Google Ads
	'fbclid', // Facebook
	'msclkid', // Microsoft Ads
	'ttclid', // TikTok
	'li_fat_id', // LinkedIn
	'mc_cid', // Mailchimp Campaign ID
	'mc_eid', // Mailchimp Email ID
]

/**
 * Removes UTM and other marketing parameters from a URL string
 */
export function cleanUtmParams(url: string): string {
	try {
		const urlObj = new URL(url, window.location.origin)
		UTM_PARAMS.forEach((param) => {
			urlObj.searchParams.delete(param)
		})
		return urlObj.toString()
	} catch {
		// If URL parsing fails, return original
		return url
	}
}

/**
 * Removes UTM and other marketing parameters from URLSearchParams
 */
export function cleanUtmSearchParams(searchParams: URLSearchParams): URLSearchParams {
	const cleaned = new URLSearchParams(searchParams)
	UTM_PARAMS.forEach((param) => {
		cleaned.delete(param)
	})
	return cleaned
}

/**
 * Removes UTM parameters from the current browser location without causing a navigation
 */
export function cleanCurrentUrlUtmParams(): void {
	const url = new URL(window.location.href)
	let hasUtmParams = false

	UTM_PARAMS.forEach((param) => {
		if (url.searchParams.has(param)) {
			url.searchParams.delete(param)
			hasUtmParams = true
		}
	})

	// Only update if we actually removed parameters
	if (hasUtmParams) {
		window.history.replaceState({}, document.title, url.toString())
	}
}

/**
 * Hook to clean UTM parameters on initial page load
 */
export function useCleanUtmParams() {
	// Clean UTM parameters from URL on first load
	// This should run once when the app initializes
	if (typeof window !== 'undefined') {
		cleanCurrentUrlUtmParams()
	}
}
