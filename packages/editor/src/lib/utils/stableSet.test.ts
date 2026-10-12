import { stableSet } from './stableSet'

const a = 'a'
const b = 'b'
const c = 'c'

describe('stableSet', () => {
	it('returns the next set when there is no previous one', () => {
		const next = new Set([a])
		expect(stableSet(null, next)).toBe(next)
	})

	it('returns the previous set when the members match', () => {
		const previous = new Set([a, b])
		expect(stableSet(previous, new Set([b, a]))).toBe(previous)
	})

	it('returns the next set when a member is swapped', () => {
		const next = new Set([a, c])
		expect(stableSet(new Set([a, b]), next)).toBe(next)
	})

	it('returns the next set when the sizes differ', () => {
		const next = new Set([a])
		expect(stableSet(new Set([a, b]), next)).toBe(next)
	})
})
