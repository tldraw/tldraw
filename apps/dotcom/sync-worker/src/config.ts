/**
 * How often we the document to R2?
 * 8 seconds.
 */
export const PERSIST_INTERVAL_MS = 8_000

/**
 * The URL of the PostHog instance to use.
 */
export const POSTHOG_URL = 'https://eu.i.posthog.com'

/**
 * Beta fairy access expiration date: Dec 31, 2025 23:59:59 UTC
 */
export const FAIRY_BETA_EXPIRATION = new Date('2025-12-31T23:59:59Z').getTime()
