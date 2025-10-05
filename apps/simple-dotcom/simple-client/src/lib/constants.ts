// Application Constants
// Centralized configuration values for the application

// ============================================================================
// Workspace Limits
// ============================================================================

export const WORKSPACE_LIMITS = {
	/**
	 * Maximum number of members allowed per workspace
	 * This includes the owner
	 */
	MAX_MEMBERS: 100,

	/**
	 * Threshold at which to show warning about approaching limit
	 * Set to 90% of MAX_MEMBERS
	 */
	WARNING_THRESHOLD: 90,
} as const

// ============================================================================
// Session Configuration
// ============================================================================

export const SESSION_CONFIG = {
	/**
	 * Session timeout in milliseconds (30 minutes)
	 */
	TIMEOUT_MS: 30 * 60 * 1000,

	/**
	 * Warning threshold before session expires (5 minutes)
	 */
	WARNING_THRESHOLD_MS: 5 * 60 * 1000,
} as const

// ============================================================================
// API Rate Limits
// ============================================================================

export const RATE_LIMITS = {
	/**
	 * Default rate limit per IP per minute
	 */
	DEFAULT_PER_MINUTE: 60,

	/**
	 * Rate limit for authentication endpoints
	 */
	AUTH_PER_MINUTE: 10,

	/**
	 * Rate limit for workspace creation
	 */
	WORKSPACE_CREATE_PER_HOUR: 10,
} as const

// ============================================================================
// Validation Rules
// ============================================================================

export const VALIDATION = {
	WORKSPACE_NAME: {
		MIN_LENGTH: 1,
		MAX_LENGTH: 100,
	},
	DOCUMENT_NAME: {
		MIN_LENGTH: 1,
		MAX_LENGTH: 200,
	},
	FOLDER_NAME: {
		MIN_LENGTH: 1,
		MAX_LENGTH: 100,
	},
	USER_DISPLAY_NAME: {
		MIN_LENGTH: 1,
		MAX_LENGTH: 100,
	},
} as const
