/**
 * How often we persist the document to R2?
 * 8 seconds.
 */
export const PERSIST_INTERVAL_MS = 8_000

/**
 * How often we flush accumulated diffs to SQLite?
 * 100 milliseconds.
 */
export const SQLITE_FLUSH_INTERVAL_MS = 100

/**
 * The URL of the PostHog instance to use.
 */
export const POSTHOG_URL = 'https://eu.i.posthog.com'
