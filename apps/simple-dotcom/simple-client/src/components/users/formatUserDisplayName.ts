// User Display Name Formatting Utility
// CRITICAL: Never expose raw email addresses in UI

/**
 * Format a user's display name safely
 * Falls back to safe alternatives if no display name is available
 * NEVER returns raw email addresses
 *
 * @param user - User object with optional name, display_name, and email
 * @returns Formatted display name that's safe to show in UI
 */
export function formatUserDisplayName(
	user?: {
		id?: string
		name?: string | null
		display_name?: string | null
		email?: string
	} | null
): string {
	if (!user) {
		return 'Unknown User'
	}

	// Priority order: display_name > name > safe fallback
	if (user.display_name?.trim()) {
		return user.display_name.trim()
	}

	if (user.name?.trim()) {
		return user.name.trim()
	}

	// Safe fallback: Use first 8 chars of user ID
	// NEVER use email here
	if (user.id) {
		return `User ${user.id.substring(0, 8)}`
	}

	return 'Unknown User'
}

/**
 * Get user initials for avatar display
 * @param user - User object
 * @returns 1-2 character initials
 */
export function getUserInitials(
	user?: {
		name?: string | null
		display_name?: string | null
		email?: string
	} | null
): string {
	if (!user) {
		return '?'
	}

	const displayName = user.display_name?.trim() || user.name?.trim()

	if (!displayName) {
		// Use first letter of email username as last resort
		// But never show the full email
		if (user.email) {
			const username = user.email.split('@')[0]
			return username[0]?.toUpperCase() || '?'
		}
		return '?'
	}

	// Get initials from display name
	const parts = displayName.split(/\s+/).filter(Boolean)

	if (parts.length === 0) {
		return '?'
	}

	if (parts.length === 1) {
		// Single word: use first two letters
		return parts[0].substring(0, 2).toUpperCase()
	}

	// Multiple words: use first letter of first and last word
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Get a color for user avatar based on user ID
 * Ensures consistent color for the same user
 */
export function getUserAvatarColor(userId?: string): string {
	if (!userId) {
		return 'bg-gray-400'
	}

	// Simple hash function to get consistent color
	let hash = 0
	for (let i = 0; i < userId.length; i++) {
		hash = userId.charCodeAt(i) + ((hash << 5) - hash)
	}

	const colors = [
		'bg-blue-500',
		'bg-green-500',
		'bg-yellow-500',
		'bg-purple-500',
		'bg-pink-500',
		'bg-indigo-500',
		'bg-red-500',
		'bg-orange-500',
	]

	return colors[Math.abs(hash) % colors.length]
}
