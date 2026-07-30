import { describe, expect, it } from 'vitest'
import { isDividerName } from './pageDividers'

describe('isDividerName', () => {
	it('accepts three or more hyphens', () => {
		expect(isDividerName('---')).toBe(true)
		expect(isDividerName('----')).toBe(true)
		expect(isDividerName('----------')).toBe(true)
	})

	it('ignores surrounding whitespace', () => {
		expect(isDividerName('  ---  ')).toBe(true)
		expect(isDividerName('\t---\n')).toBe(true)
	})

	it('rejects fewer than three hyphens', () => {
		expect(isDividerName('')).toBe(false)
		expect(isDividerName('-')).toBe(false)
		expect(isDividerName('--')).toBe(false)
	})

	it('rejects names with other characters', () => {
		expect(isDividerName('- - -')).toBe(false)
		expect(isDividerName('--- notes')).toBe(false)
		expect(isDividerName('notes ---')).toBe(false)
		expect(isDividerName('---a---')).toBe(false)
	})

	it('rejects non-hyphen dash characters', () => {
		expect(isDividerName('———')).toBe(false) // em dashes
		expect(isDividerName('–––')).toBe(false) // en dashes
		expect(isDividerName('___')).toBe(false)
	})
})
