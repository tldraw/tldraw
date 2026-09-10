import { describe, expect, it } from 'vitest'
import { formatFullDateTime, formatRelativeTime } from './format-time'

/** An ISO timestamp `seconds` in the past, relative to now. */
function agoIso(seconds: number): string {
	return new Date(Date.now() - seconds * 1000).toISOString()
}

const TWO_HOURS = 2 * 60 * 60

describe('formatRelativeTime', () => {
	it('formats in English by default', () => {
		expect(formatRelativeTime(agoIso(TWO_HOURS))).toBe(
			new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'narrow' }).format(-2, 'hour')
		)
	})

	// `Byline` passes the UI's current translation locale; without this a localized app showed
	// English timestamps under localized everything else.
	it('formats in the given locale', () => {
		const french = formatRelativeTime(agoIso(TWO_HOURS), 'fr')
		expect(french).toBe(
			new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: 'narrow' }).format(-2, 'hour')
		)
		expect(french).not.toBe(formatRelativeTime(agoIso(TWO_HOURS), 'en'))
	})

	// The parameter is optional, so undefined has to mean "the default", not "no locale".
	it('treats an undefined locale as the default', () => {
		expect(formatRelativeTime(agoIso(TWO_HOURS), undefined)).toBe(
			formatRelativeTime(agoIso(TWO_HOURS))
		)
	})

	it('reads under a minute as "now" in the given locale', () => {
		expect(formatRelativeTime(agoIso(5), 'fr')).toBe(
			new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: 'narrow' }).format(0, 'second')
		)
	})

	it('returns nothing for an unparseable date', () => {
		expect(formatRelativeTime('not a date', 'fr')).toBe('')
	})
})

describe('formatFullDateTime', () => {
	it('formats an ISO datetime as a full date and time', () => {
		const iso = '2025-07-22T16:44:00.000Z'
		expect(formatFullDateTime(iso)).toBe(
			new Intl.DateTimeFormat('en', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso))
		)
	})

	it('formats in the given locale', () => {
		const french = formatFullDateTime('2025-07-22T16:44:00.000Z', 'fr')
		expect(french).toContain('juillet')
		expect(french).not.toBe(formatFullDateTime('2025-07-22T16:44:00.000Z', 'en'))
	})

	// The parameter is optional, so undefined has to mean "the default", not "no locale".
	it('treats an undefined locale as the default', () => {
		const iso = '2025-07-22T16:44:00.000Z'
		expect(formatFullDateTime(iso, undefined)).toBe(formatFullDateTime(iso))
	})

	it('returns an empty string for invalid dates', () => {
		expect(formatFullDateTime('not a date')).toBe('')
	})
})
