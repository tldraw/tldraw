const DIVISIONS = [
	{ amount: 60, unit: 'second' },
	{ amount: 60, unit: 'minute' },
	{ amount: 24, unit: 'hour' },
	{ amount: 7, unit: 'day' },
	{ amount: 4.34524, unit: 'week' },
	{ amount: 12, unit: 'month' },
	{ amount: Number.POSITIVE_INFINITY, unit: 'year' },
] as const

/**
 * Format an ISO datetime as relative time ("2 hours ago", "yesterday", "last week").
 * Locale-aware via Intl.RelativeTimeFormat.
 */
export function formatRelativeTime(iso: string, locale = 'en'): string {
	const then = new Date(iso).getTime()
	if (Number.isNaN(then)) return ''

	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
	let duration = (then - Date.now()) / 1000
	for (const division of DIVISIONS) {
		if (Math.abs(duration) < division.amount) {
			return rtf.format(Math.round(duration), division.unit)
		}
		duration /= division.amount
	}
	return ''
}
