// Type definitions for better type safety
export interface UserForUsernamePicker {
	fullName?: string | null
	emailAddresses: Array<{ emailAddress: string }>
}

/**
 * Extract and format username from email address
 * @param email - The email address to extract from
 * @returns Formatted display name or fallback
 */
export function extractUsernameFromEmail(email: string): string {
	if (!email?.includes('@')) return 'user'

	const username = email.split('@')[0]
	if (username.length < 2) return 'user'

	// Clean and format username in one operation
	return (
		username
			.replace(/[._+-]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.toLowerCase()
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ') || 'user'
	)
}

/**
 * Check if user needs username picker
 * @param user - The user object
 * @returns True if user needs to pick a username
 */
export function needsUsernamePicker(user: UserForUsernamePicker): boolean {
	// Early return if user already has a name
	if (user.fullName?.trim()) return false

	// Check if user has a valid email address
	return Boolean(user.emailAddresses?.[0]?.emailAddress?.includes('@'))
}
