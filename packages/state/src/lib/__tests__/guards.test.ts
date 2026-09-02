import { atom, isAtom } from '../Atom'
import { computed, getComputedInstance, isComputed } from '../Computed'
import { isSignal } from '../isSignal'

// Tests for SPEC.md §14 (type guards and module duplication).
// Rule G2 (singleton sharing across module copies) is covered at the unit level in helpers.test.ts.

describe('type guards (G1)', () => {
	const a = atom('a', 1)
	const c = computed('c', () => a.get() * 2)

	class Foo {
		x = atom('x', 1)
		@computed
		getY() {
			return this.x.get()
		}
	}
	const decorated = getComputedInstance(new Foo(), 'getY')

	const nonSignals = [null, undefined, 0, 1, NaN, 'hello', {}, [], () => {}, Symbol('s')]

	it('[G1] isAtom is true exactly for atoms', () => {
		expect(isAtom(a)).toBe(true)
		expect(isAtom(c)).toBe(false)
		expect(isAtom(decorated)).toBe(false)
		for (const value of nonSignals) {
			expect(isAtom(value)).toBe(false)
		}
	})

	it('[G1] isComputed is true exactly for computed signals', () => {
		expect(isComputed(c)).toBe(true)
		expect(isComputed(decorated)).toBe(true)
		expect(isComputed(a)).toBe(false)
		for (const value of nonSignals) {
			expect(isComputed(value)).toBe(false)
		}
	})

	it('[G1] isSignal is true exactly for atoms and computed signals', () => {
		expect(isSignal(a)).toBe(true)
		expect(isSignal(c)).toBe(true)
		expect(isSignal(decorated)).toBe(true)
		for (const value of nonSignals) {
			expect(isSignal(value)).toBe(false)
		}
	})
})
