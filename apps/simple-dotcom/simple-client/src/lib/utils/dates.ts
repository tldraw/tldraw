/**
 * Date utilities for time-based grouping
 *
 * Based on apps/dotcom/client/src/tla/utils/dates.ts
 */

/**
 * Get relevant date boundaries for time-based grouping
 *
 * All boundaries are returned as UTC timestamps (ms since epoch).
 * These boundaries are calculated based on the current date/time.
 */
export function getRelevantDates() {
	const now = new Date()

	return {
		// Start of today (midnight)
		today: new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
		// Start of yesterday (midnight)
		yesterday: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime(),
		// Start of this week (Sunday at midnight)
		thisWeek: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime(),
		// Start of this month (1st day at midnight)
		thisMonth: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
	}
}
