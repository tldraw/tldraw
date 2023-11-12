import { cleanupText } from '../text/text'

describe(cleanupText, () => {
	it('can handle the empty string', () => {
		expect(cleanupText('')).toBe('')
	})
	it('can handle space-only strings', () => {
		expect(cleanupText(' ')).toBe('')
		expect(cleanupText('   ')).toBe('')
	})
})
