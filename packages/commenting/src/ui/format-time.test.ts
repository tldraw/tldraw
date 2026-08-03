import { describe, expect, it } from 'vitest'
import { formatFullDateTime } from './format-time'

describe('formatFullDateTime', () => {
	it('formats an ISO datetime as a full date and time', () => {
		const iso = '2025-07-22T16:44:00.000Z'
		expect(formatFullDateTime(iso)).toBe(
			new Intl.DateTimeFormat('en', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso))
		)
	})

	it('respects the locale', () => {
		const iso = '2025-07-22T16:44:00.000Z'
		const french = formatFullDateTime(iso, 'fr')
		expect(french).toContain('juillet')
		expect(french).not.toBe(formatFullDateTime(iso, 'en'))
	})

	it('returns an empty string for invalid dates', () => {
		expect(formatFullDateTime('not a date')).toBe('')
	})
})
