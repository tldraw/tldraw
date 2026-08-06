import { getFirstCharacter } from './string'

describe('getFirstCharacter', () => {
	it('returns the first character of a plain string', () => {
		expect(getFirstCharacter('hello')).toBe('h')
	})

	it('returns an empty string for an empty input', () => {
		expect(getFirstCharacter('')).toBe('')
	})

	it('keeps a leading emoji whole instead of splitting a surrogate pair', () => {
		expect(getFirstCharacter('😀 hello')).toBe('😀')
	})

	it('keeps a multi-code-point emoji cluster whole', () => {
		expect(getFirstCharacter('👨‍👩‍👧 family')).toBe('👨‍👩‍👧')
	})

	it('handles a leading whitespace character', () => {
		expect(getFirstCharacter(' hi')).toBe(' ')
	})
})
