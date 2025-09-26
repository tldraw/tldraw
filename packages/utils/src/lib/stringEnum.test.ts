import { describe, expect, it } from 'vitest'
import { stringEnum } from './stringEnum'

describe('stringEnum', () => {
	it('should create object with string keys mapping to themselves', () => {
		const result = stringEnum('red', 'green', 'blue')

		expect(result).toEqual({
			red: 'red',
			green: 'green',
			blue: 'blue',
		})
	})

	it('should handle empty input', () => {
		const result = stringEnum()
		expect(result).toEqual({})
	})

	it('should handle duplicate values', () => {
		const result = stringEnum('duplicate', 'unique', 'duplicate')
		expect(result).toEqual({
			duplicate: 'duplicate',
			unique: 'unique',
		})
		expect(Object.keys(result)).toHaveLength(2)
	})
})
