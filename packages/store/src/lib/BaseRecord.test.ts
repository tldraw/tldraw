import { describe, expect, it } from 'vitest'
import { isRecord } from './BaseRecord'

describe('isRecord function', () => {
	it('should return true for valid records', () => {
		const validRecord = {
			id: 'book:123',
			typeName: 'book',
			title: '1984',
		}

		expect(isRecord(validRecord)).toBe(true)
	})

	it('should return false for null and undefined', () => {
		expect(isRecord(null)).toBe(false)
		expect(isRecord(undefined)).toBe(false)
	})

	it('should return false for primitive types', () => {
		expect(isRecord('string')).toBe(false)
		expect(isRecord(42)).toBe(false)
		expect(isRecord(true)).toBe(false)
	})

	it('should return false for objects missing required properties', () => {
		expect(isRecord({})).toBe(false)
		expect(isRecord({ id: 'test' })).toBe(false)
		expect(isRecord({ typeName: 'test' })).toBe(false)
	})

	it('should work as type guard', () => {
		const unknownValue: unknown = {
			id: 'book:123',
			typeName: 'book',
			title: '1984',
		}

		if (isRecord(unknownValue)) {
			expect(unknownValue.id).toBe('book:123')
			expect(unknownValue.typeName).toBe('book')
		}
	})
})
