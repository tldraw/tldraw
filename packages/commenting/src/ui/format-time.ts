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
 * Format an ISO datetime as compact relative time ("2h ago", "yesterday", "last wk.").
 * Locale-aware via Intl.RelativeTimeFormat.
 * @public
 */
export function formatRelativeTime(iso: string, locale = 'en'): string {
	const then = new Date(iso).getTime()
	if (Number.isNaN(then)) return ''

	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' })
	let duration = (then - Date.now()) / 1000
	// Under a minute is just "now" — with second granularity the label visibly ticks while
	// typing a reply (every keystroke re-renders the card).
	if (Math.abs(duration) < 60) {
		return rtf.format(0, 'second')
	}
	for (const division of DIVISIONS) {
		if (Math.abs(duration) < division.amount) {
			return rtf.format(Math.round(duration), division.unit)
		}
		duration /= division.amount
	}
	return ''
}

// Cached per locale — comment cards re-render on every reply keystroke, and constructing a
// DateTimeFormat is far more expensive than formatting with one.
const fullDateTimeFormatters = new Map<string, Intl.DateTimeFormat>()

/**
 * Format an ISO datetime as a full date and time ("Tuesday, July 22, 2025 at 4:44 PM").
 * Locale-aware via Intl.DateTimeFormat.
 * @public
 */
export function formatFullDateTime(iso: string, locale = 'en'): string {
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return ''
	let formatter = fullDateTimeFormatters.get(locale)
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' })
		fullDateTimeFormatters.set(locale, formatter)
	}
	return formatter.format(date)
}
