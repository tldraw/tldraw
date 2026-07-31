import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './format-time'

/** An ISO timestamp `seconds` in the past, relative to now. */
function agoIso(seconds: number): string {
	return new Date(Date.now() - seconds * 1000).toISOString()
}

const TWO_HOURS = 2 * 60 * 60

describe('formatRelativeTime', () => {
	it('formats in English by default', () => {
		expect(formatRelativeTime(agoIso(TWO_HOURS))).toBe(
			new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' }).format(-2, 'hour')
		)
	})

	// The bylines render whatever locale the editor is set to; without this a localized app showed
	// English timestamps under localized everything else.
	it('formats in the given locale', () => {
		const french = formatRelativeTime(agoIso(TWO_HOURS), 'fr')
		expect(french).toBe(
			new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: 'short' }).format(-2, 'hour')
		)
		expect(french).not.toBe(formatRelativeTime(agoIso(TWO_HOURS), 'en'))
	})

	// `locale` is optional the whole way down (card → byline → here), so undefined has to mean
	// "the default", not "no locale".
	it('treats an undefined locale as the default', () => {
		expect(formatRelativeTime(agoIso(TWO_HOURS), undefined)).toBe(
			formatRelativeTime(agoIso(TWO_HOURS))
		)
	})

	it('reads under a minute as "now" in the given locale', () => {
		expect(formatRelativeTime(agoIso(5), 'fr')).toBe(
			new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: 'short' }).format(0, 'second')
		)
	})

	it('returns nothing for an unparseable date', () => {
		expect(formatRelativeTime('not a date', 'fr')).toBe('')
	})
})
