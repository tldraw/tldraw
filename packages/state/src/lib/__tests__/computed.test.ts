import { vi } from 'vitest'
import { atom } from '../Atom'
import { Computed, _Computed, computed, getComputedInstance, isUninitialized } from '../Computed'
import { GLOBAL_START_EPOCH } from '../constants'
import { react } from '../EffectScheduler'
import { advanceGlobalEpoch, getGlobalEpoch } from '../transactions'

// Tests for SPEC.md §6 (computed signals).
// Rule IDs like [C2] in test names refer to that document.

function getLastCheckedEpoch(derivation: Computed<any>): number {
	return (derivation as any).lastCheckedEpoch
}

describe('computed signals (C)', () => {
	it('[C1] are lazy: the compute function does not run until the first get', () => {
		const a = atom('a', 1)
		const double = vi.fn(() => a.get() * 2)
		const derivation = computed('double', double)

		expect(double).toHaveBeenCalledTimes(0)

		a.set(2)
		expect(double).toHaveBeenCalledTimes(0)

		expect(derivation.get()).toBe(4)
		expect(double).toHaveBeenCalledTimes(1)
	})

	it('[C2] recompute only when a parent has changed', () => {
		const a = atom('', 1)
		const double = vi.fn(() => a.get() * 2)
		const derivation = computed('', double)
		const startEpoch = getGlobalEpoch()

		expect(derivation.get()).toBe(2)
		expect(double).toHaveBeenCalledTimes(1)

		expect(derivation.lastChangedEpoch).toBe(startEpoch)

		expect(derivation.get()).toBe(2)
		expect(derivation.get()).toBe(2)
		expect(double).toHaveBeenCalledTimes(1)
		expect(derivation.lastChangedEpoch).toBe(startEpoch)

		a.set(2)
		const nextEpoch = getGlobalEpoch()
		expect(nextEpoch > startEpoch).toBe(true)

		// lazy: no recomputation until deref
		expect(double).toHaveBeenCalledTimes(1)
		expect(derivation.lastChangedEpoch).toBe(startEpoch)
		expect(derivation.get()).toBe(4)

		expect(double).toHaveBeenCalledTimes(2)
		expect(derivation.lastChangedEpoch).toBe(nextEpoch)

		// changing an unrelated atom has no effect
		const unrelatedAtom = atom('', 1)
		unrelatedAtom.set(2)
		unrelatedAtom.set(3)

		expect(derivation.get()).toBe(4)
		expect(double).toHaveBeenCalledTimes(2)
		expect(derivation.lastChangedEpoch).toBe(nextEpoch)
	})

	it('[C2] update their lastCheckedEpoch without recomputing when the epoch advances for unrelated reasons', () => {
		const startEpoch = getGlobalEpoch()
		const a = atom('', 1)

		const double = vi.fn(() => a.get() * 2)
		const derivation = computed('', double)

		derivation.get()

		expect(getLastCheckedEpoch(derivation)).toEqual(startEpoch)

		advanceGlobalEpoch()
		derivation.get()

		expect(getLastCheckedEpoch(derivation)).toBeGreaterThan(startEpoch)

		expect(double).toHaveBeenCalledTimes(1)
	})

	it('[C3] never recompute if the first execution captured no parents', () => {
		const derive = vi.fn(() => 1)
		const startEpoch = getGlobalEpoch()
		const derivation = computed('', derive)

		expect(derive).toHaveBeenCalledTimes(0)

		expect(derivation.get()).toBe(1)
		expect(derivation.get()).toBe(1)

		expect(derive).toHaveBeenCalledTimes(1)

		advanceGlobalEpoch()
		advanceGlobalEpoch()

		expect(derivation.get()).toBe(1)
		expect(derivation.get()).toBe(1)

		expect(derive).toHaveBeenCalledTimes(1)

		expect(derivation.parents.length).toBe(0)
		expect(derivation.lastChangedEpoch).toBe(startEpoch)
	})

	it('[C4] pass the previous value and the last-computed epoch to the compute function', () => {
		const a = atom('a', 1)
		const calls: Array<[unknown, number]> = []
		const derivation = computed('', (prev, lastComputedEpoch) => {
			calls.push([prev, lastComputedEpoch])
			return a.get() * 2
		})

		expect(derivation.get()).toBe(2)
		expect(isUninitialized(calls[0][0])).toBe(true)
		expect(calls[0][1]).toBe(GLOBAL_START_EPOCH)

		const firstComputedEpoch = getGlobalEpoch()

		a.set(2)

		expect(derivation.get()).toBe(4)
		expect(isUninitialized(calls[1][0])).toBe(false)
		expect(calls[1][0]).toBe(2)
		expect(calls[1][1]).toBe(firstComputedEpoch)
	})

	it('[C5] keep the previous value and epoch when recomputation produces an equal value', () => {
		const a = atom('a', 1.2)
		const floored = computed('floored', () => Math.floor(a.get()))

		expect(floored.get()).toBe(1)
		const changedEpoch = floored.lastChangedEpoch

		a.set(1.9)

		expect(floored.get()).toBe(1)
		expect(floored.lastChangedEpoch).toBe(changedEpoch)

		a.set(2.3)

		expect(floored.get()).toBe(2)
		expect(floored.lastChangedEpoch).toBeGreaterThan(changedEpoch)
	})

	it('[C5] never invoke isEqual for the first computation', () => {
		const isEqual = vi.fn((a, b) => a === b)

		const a = atom('a', 1)
		const b = computed('b', () => a.get() * 2, { isEqual })

		expect(b.get()).toBe(2)
		expect(isEqual).not.toHaveBeenCalled()
		expect(b.get()).toBe(2)
		expect(isEqual).not.toHaveBeenCalled()

		a.set(2)

		expect(b.get()).toBe(4)
		expect(isEqual).toHaveBeenCalledTimes(1)
		expect(b.get()).toBe(4)
		expect(isEqual).toHaveBeenCalledTimes(1)
	})

	it('[C6] stop propagation early in chains when an intermediate value does not change', () => {
		const a = atom('a', 1.2)
		const floored = computed('floored', () => Math.floor(a.get()))
		const tens = vi.fn(() => floored.get() * 10)
		const derivation = computed('tens', tens)

		expect(derivation.get()).toBe(10)
		expect(tens).toHaveBeenCalledTimes(1)

		a.set(1.5)

		expect(derivation.get()).toBe(10)
		expect(tens).toHaveBeenCalledTimes(1)

		a.set(2.5)

		expect(derivation.get()).toBe(20)
		expect(tens).toHaveBeenCalledTimes(2)
	})

	it('[C7] isActivelyListening is true exactly when something is listening downstream', () => {
		const a = atom('a', 1)
		const c = computed('c', () => a.get())

		expect(c.isActivelyListening).toBe(false)

		c.get()
		expect(c.isActivelyListening).toBe(false)

		const stop = react('r', () => {
			c.get()
		})
		expect(c.isActivelyListening).toBe(true)

		stop()
		expect(c.isActivelyListening).toBe(false)
	})
})

describe('the computed decorator (C8, C9, C10)', () => {
	it('[C8] makes a class method behave as a cached, reactive computed', () => {
		const compute = vi.fn(function (this: Foo) {
			return this.a.get() * 2
		})
		class Foo {
			a = atom('a', 1)
			@computed
			getB() {
				return compute.call(this)
			}
		}

		const foo = new Foo()

		expect(foo.getB()).toBe(2)
		expect(foo.getB()).toBe(2)
		expect(compute).toHaveBeenCalledTimes(1)

		foo.a.set(2)

		expect(foo.getB()).toBe(4)
		expect(compute).toHaveBeenCalledTimes(2)
	})

	it('[C8] honors options passed to the decorator', () => {
		let numComputations = 0
		class Foo {
			a = atom('a', 1)

			@computed({ isEqual: (a, b) => a.b === b.b })
			getB() {
				numComputations++
				return { b: this.a.get() * this.a.get() }
			}
		}

		const foo = new Foo()

		const firstVal = foo.getB()
		expect(firstVal).toEqual({ b: 1 })

		foo.a.set(-1)

		const secondVal = foo.getB()
		expect(secondVal).toEqual({ b: 1 })

		// [EQ4] the previous value object is retained when the new value is equal
		expect(firstVal).toBe(secondVal)
		expect(numComputations).toBe(2)
	})

	it('[C8] creates a separate computed per instance', () => {
		class Foo {
			a = atom('a', 1)
			@computed
			getB() {
				return this.a.get() * 2
			}
		}

		const foo1 = new Foo()
		const foo2 = new Foo()

		foo1.a.set(10)

		expect(foo1.getB()).toBe(20)
		expect(foo2.getB()).toBe(2)
	})

	it('[C9] getComputedInstance retrieves the underlying computed, creating it on demand', () => {
		class Foo {
			a = atom('a', 1)

			@computed
			getB() {
				return this.a.get() * 2
			}
		}

		const foo = new Foo()

		// the method has not been called yet
		const bInst = getComputedInstance(foo, 'getB')

		expect(bInst).toBeDefined()
		expect(bInst).toBeInstanceOf(_Computed)
		expect(bInst.get()).toBe(2)

		foo.a.set(2)
		expect(bInst.get()).toBe(4)
	})

	it('[C10] works on getters (legacy decorators) but logs a one-time deprecation warning', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		class Foo {
			a = atom('a', 1)
			// eslint-disable-next-line tldraw/no-setter-getter
			@computed
			get b() {
				return this.a.get() * 2
			}
		}

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('deprecated')

		const foo = new Foo()
		expect(foo.b).toBe(2)
		foo.a.set(2)
		expect(foo.b).toBe(4)

		// the warning is logged once per process, not once per class
		class Bar {
			a = atom('a', 1)
			// eslint-disable-next-line tldraw/no-setter-getter
			@computed
			get b() {
				return this.a.get()
			}
		}
		expect(new Bar().b).toBe(1)
		expect(warn).toHaveBeenCalledTimes(1)

		warn.mockRestore()
	})
})
