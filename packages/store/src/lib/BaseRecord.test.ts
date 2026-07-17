import { describe, expect, it } from 'vitest'
import { isRecord } from './BaseRecord'

// Tests for SPEC.md §2 (records).
// Rule IDs like [R1] in test names refer to that document.

describe('records (R)', () => {
	it('[R1] isRecord is true exactly for objects with an id and a typeName', () => {
		expect(isRecord({ id: 'book:123', typeName: 'book', title: '1984' })).toBe(true)
		expect(isRecord({ id: 'book:123', typeName: 'book' })).toBe(true)

		expect(isRecord(null)).toBe(false)
		expect(isRecord(undefined)).toBe(false)
		expect(isRecord('string')).toBe(false)
		expect(isRecord(42)).toBe(false)
		expect(isRecord(true)).toBe(false)
		expect(isRecord({})).toBe(false)
		expect(isRecord({ id: 'test' })).toBe(false)
		expect(isRecord({ typeName: 'test' })).toBe(false)
	})

	it('[R1] isRecord narrows the type of its argument', () => {
		const unknownValue: unknown = { id: 'book:123', typeName: 'book', title: '1984' }

		if (isRecord(unknownValue)) {
			expect(unknownValue.id).toBe('book:123')
			expect(unknownValue.typeName).toBe('book')
		} else {
			throw new Error('expected a record')
		}
	})
})
