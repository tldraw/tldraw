/**
 * Validate redirect URL to prevent open redirect attacks
 * @param url - The URL to validate
 * @returns true if the URL is safe to redirect to
 */
export function isValidRedirect(url: string): boolean {
	// Only allow internal redirects (must start with / but not //)
	return url.startsWith('/') && !url.startsWith('//')
}
