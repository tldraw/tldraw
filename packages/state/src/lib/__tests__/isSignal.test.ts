import { describe, expect, it } from 'vitest'
import { atom } from '../Atom'
import { computed } from '../Computed'
import { isSignal } from '../isSignal'

describe('isSignal', () => {
	it('returns true for atoms', () => {
		const atomSignal = atom('test-atom', 42)
		expect(isSignal(atomSignal)).toBe(true)
	})

	it('returns true for computed signals', () => {
		const baseAtom = atom('base', 10)
		const computedSignal = computed('test-computed', () => baseAtom.get() * 2)
		expect(isSignal(computedSignal)).toBe(true)
	})

	it('returns false for non-signals', () => {
		expect(isSignal(42)).toBe(false)
		expect(isSignal('string')).toBe(false)
		expect(isSignal(null)).toBe(false)
		expect(isSignal(undefined)).toBe(false)
		expect(isSignal({})).toBe(false)
		expect(isSignal([])).toBe(false)
		expect(isSignal(() => {})).toBe(false)
	})

	it('returns false for objects that mimic signal interface', () => {
		const fakeSignal = {
			name: 'fake',
			get: () => 'value',
			lastChangedEpoch: 1,
		}
		expect(isSignal(fakeSignal)).toBe(false)
	})
})
