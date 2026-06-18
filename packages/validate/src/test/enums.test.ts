import * as T from '../lib/validation'

describe('§8 Enums', () => {
	it('[EN1] setEnum accepts exactly the set members', () => {
		const validator = T.setEnum(new Set(['red', 'green', 'blue']))
		expect(validator.validate('red')).toBe('red')
		expect(validator.validate('blue')).toBe('blue')
		expect(() => validator.validate('yellow')).toThrow(
			'Expected "red" or "green" or "blue", got yellow'
		)
	})

	it('[EN1] the failure message JSON-stringifies the allowed values and string-interpolates the actual one', () => {
		expect(() => T.setEnum(new Set([1, 2])).validate(3)).toThrow('Expected 1 or 2, got 3')
		expect(() => T.setEnum(new Set(['a', 'b'])).validate({ toString: () => 'OBJ' })).toThrow(
			'Expected "a" or "b", got OBJ'
		)
	})

	it('[EN2] literalEnum behaves as a setEnum over its arguments', () => {
		const validator = T.literalEnum('light', 'dark', 'auto')
		expect(validator.validate('light')).toBe('light')
		expect(validator.validate('auto')).toBe('auto')
		expect(() => validator.validate('blue')).toThrow(
			'Expected "light" or "dark" or "auto", got blue'
		)
	})
})
