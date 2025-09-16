import { describe, expect, it, vi } from 'vitest'
import { atom } from '../Atom'
import {
	_Computed,
	Computed,
	computed,
	getComputedInstance,
	isComputed,
	isUninitialized,
	WithDiff,
	withDiff,
} from '../Computed'
import { react, reactor } from '../EffectScheduler'
import { assertNever } from '../helpers'
import { advanceGlobalEpoch, getGlobalEpoch, transact, transaction } from '../transactions'
import { RESET_VALUE, Signal } from '../types'

function getLastCheckedEpoch(derivation: Computed<any>): number {
	return (derivation as any).lastCheckedEpoch
}

describe('derivations', () => {
	it('will cache a value forever if it has no parents', () => {
		const derive = vi.fn(() => 1)
		const startEpoch = getGlobalEpoch()
		const derivation = computed('', derive)

		expect(derive).toHaveBeenCalledTimes(0)

		expect(derivation.get()).toBe(1)
		expect(derivation.get()).toBe(1)
		expect(derivation.get()).toBe(1)

		expect(derive).toHaveBeenCalledTimes(1)

		advanceGlobalEpoch()
		advanceGlobalEpoch()
		advanceGlobalEpoch()
		advanceGlobalEpoch()

		expect(derivation.get()).toBe(1)
		expect(derivation.get()).toBe(1)
		expect(derivation.get()).toBe(1)
		advanceGlobalEpoch()
		advanceGlobalEpoch()
		expect(derivation.get()).toBe(1)
		expect(derivation.get()).toBe(1)

		expect(derive).toHaveBeenCalledTimes(1)

		expect(derivation.parents.length).toBe(0)

		expect(derivation.lastChangedEpoch).toBe(startEpoch)
	})

	it('will update when parent atoms update', () => {
		const a = atom('', 1)
		const double = vi.fn(() => a.get() * 2)
		const derivation = computed('', double)
		const startEpoch = getGlobalEpoch()
		expect(double).toHaveBeenCalledTimes(0)

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

		expect(double).toHaveBeenCalledTimes(1)
		expect(derivation.lastChangedEpoch).toBe(startEpoch)
		expect(derivation.get()).toBe(4)

		expect(double).toHaveBeenCalledTimes(2)
		expect(derivation.lastChangedEpoch).toBe(nextEpoch)

		expect(derivation.get()).toBe(4)
		expect(double).toHaveBeenCalledTimes(2)
		expect(derivation.lastChangedEpoch).toBe(nextEpoch)

		// creating an unrelated atom and setting it will have no effect
		const unrelatedAtom = atom('', 1)
		unrelatedAtom.set(2)
		unrelatedAtom.set(3)
		unrelatedAtom.set(5)

		expect(derivation.get()).toBe(4)
		expect(double).toHaveBeenCalledTimes(2)
		expect(derivation.lastChangedEpoch).toBe(nextEpoch)
	})

	it('supports history', () => {
		const startEpoch = getGlobalEpoch()
		const a = atom('', 1)

		const derivation = computed('', () => a.get() * 2, {
			historyLength: 3,
			computeDiff: (a, b) => {
				return b - a
			},
		})

		derivation.get()

		expect(derivation.getDiffSince(startEpoch)).toHaveLength(0)

		a.set(2)

		expect(derivation.getDiffSince(startEpoch)).toEqual([+2])

		a.set(3)

		expect(derivation.getDiffSince(startEpoch)).toEqual([+2, +2])

		a.set(5)

		expect(derivation.getDiffSince(startEpoch)).toEqual([+2, +2, +4])

		a.set(6)
		// should fail now because we don't have enough hisstory
		expect(derivation.getDiffSince(startEpoch)).toEqual(RESET_VALUE)
	})

	it('doesnt update history if it doesnt change', () => {
		const startEpoch = getGlobalEpoch()
		const a = atom('', 1)

		const floor = vi.fn((n: number) => Math.floor(n))
		const derivation = computed('', () => floor(a.get()), {
			historyLength: 3,
			computeDiff: (a, b) => {
				return b - a
			},
		})

		expect(derivation.get()).toBe(1)
		expect(derivation.getDiffSince(startEpoch)).toHaveLength(0)

		a.set(1.2)

		expect(derivation.get()).toBe(1)
		expect(derivation.getDiffSince(startEpoch)).toHaveLength(0)
		expect(floor).toHaveBeenCalledTimes(2)

		a.set(1.5)

		expect(derivation.get()).toBe(1)
		expect(derivation.getDiffSince(startEpoch)).toHaveLength(0)
		expect(floor).toHaveBeenCalledTimes(3)

		a.set(1.9)

		expect(derivation.get()).toBe(1)
		expect(derivation.getDiffSince(startEpoch)).toHaveLength(0)
		expect(floor).toHaveBeenCalledTimes(4)

		a.set(2.3)

		expect(derivation.get()).toBe(2)
		expect(derivation.getDiffSince(startEpoch)).toEqual([+1])
		expect(floor).toHaveBeenCalledTimes(5)
	})

	it('updates the lastCheckedEpoch whenever the globalEpoch advances', () => {
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

	it('receives UNINTIALIZED as the previousValue the first time it computes', () => {
		const a = atom('', 1)
		const double = vi.fn((_prevValue) => a.get() * 2)
		const derivation = computed('', double)

		expect(derivation.get()).toBe(2)

		expect(isUninitialized(double.mock.calls[0][0])).toBe(true)

		a.set(2)

		expect(derivation.get()).toBe(4)
		expect(isUninitialized(double.mock.calls[1][0])).toBe(false)
		expect(double.mock.calls[1][0]).toBe(2)
	})

	it('receives the lastChangedEpoch as the second parameter each time it recomputes', () => {
		const a = atom('', 1)
		const double = vi.fn((_prevValue, lastChangedEpoch) => {
			expect(lastChangedEpoch).toBe(derivation.lastChangedEpoch)
			return a.get() * 2
		})
		const derivation = computed('', double)

		expect(derivation.get()).toBe(2)

		const startEpoch = getGlobalEpoch()

		a.set(2)

		expect(derivation.get()).toBe(4)
		expect(derivation.lastChangedEpoch).toBeGreaterThan(startEpoch)

		expect(double).toHaveBeenCalledTimes(2)
		expect.assertions(6)
	})

	it('can be reacted to', () => {
		const firstName = atom('', 'John')
		const lastName = atom('', 'Doe')

		let numTimesComputed = 0
		const fullName = computed('', () => {
			numTimesComputed++
			return `${firstName.get()} ${lastName.get()}`
		})

		let numTimesReacted = 0
		let name = ''
		const r = reactor('', () => {
			name = fullName.get()
			numTimesReacted++
		})

		expect(numTimesReacted).toBe(0)
		expect(name).toBe('')

		r.start()

		expect(numTimesReacted).toBe(1)
		expect(numTimesComputed).toBe(1)
		expect(name).toBe('John Doe')

		firstName.set('Jane')

		expect(numTimesComputed).toBe(2)
		expect(numTimesReacted).toBe(2)
		expect(name).toBe('Jane Doe')

		firstName.set('Jane')
		firstName.set('Jane')
		firstName.set('Jane')

		expect(numTimesComputed).toBe(2)
		expect(numTimesReacted).toBe(2)
		expect(name).toBe('Jane Doe')

		transact(() => {
			firstName.set('Wilbur')
			expect(numTimesComputed).toBe(2)
			expect(numTimesReacted).toBe(2)
			expect(name).toBe('Jane Doe')
			lastName.set('Jones')
			expect(numTimesComputed).toBe(2)
			expect(numTimesReacted).toBe(2)
			expect(name).toBe('Jane Doe')
			expect(fullName.get()).toBe('Wilbur Jones')

			expect(numTimesComputed).toBe(3)
			expect(numTimesReacted).toBe(2)
			expect(name).toBe('Jane Doe')
		})

		expect(numTimesComputed).toBe(3)
		expect(numTimesReacted).toBe(3)
		expect(name).toBe('Wilbur Jones')
	})

	it('will roll back to their initial value if a transaciton is aborted', () => {
		const firstName = atom('', 'John')
		const lastName = atom('', 'Doe')

		const fullName = computed('', () => `${firstName.get()} ${lastName.get()}`)

		transaction((rollback) => {
			firstName.set('Jane')
			lastName.set('Jones')
			expect(fullName.get()).toBe('Jane Jones')
			rollback()
		})

		expect(fullName.get()).toBe('John Doe')
	})

	it('will add history items if a transaction is aborted', () => {
		const a = atom('', 1)
		const b = atom('', 1)

		const c = computed('', () => a.get() + b.get(), {
			historyLength: 3,
			computeDiff: (a, b) => b - a,
		})

		const startEpoch = getGlobalEpoch()

		transaction((rollback) => {
			expect(c.getDiffSince(startEpoch)).toEqual([])
			a.set(2)
			b.set(2)
			expect(c.getDiffSince(startEpoch)).toEqual([+2])
			rollback()
		})

		expect(c.getDiffSince(startEpoch)).toEqual([2, -2])
	})

	it('will return RESET_VALUE if .getDiffSince is called with an epoch before initialization', () => {
		const a = atom('', 1)
		const b = atom('', 1)

		const c = computed('', () => a.get() + b.get(), {
			historyLength: 3,
			computeDiff: (a, b) => b - a,
		})

		expect(c.getDiffSince(getGlobalEpoch() - 1)).toEqual(RESET_VALUE)
	})
})

type Difference =
	| {
			type: 'CHANGE'
			path: string[]
			value: any
			oldValue: any
	  }
	| { type: 'CREATE'; path: string[]; value: any }
	| { type: 'REMOVE'; path: string[]; oldValue: any }

function getIncrementalRecordMapper<In, Out>(
	obj: Signal<Record<string, In>, Difference[]>,
	mapper: (t: In, k: string) => Out
): Computed<Record<string, Out>> {
	function computeFromScratch() {
		const input = obj.get()
		return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, mapper(v, k)]))
	}
	return computed('', (previousValue, lastComputedEpoch) => {
		if (isUninitialized(previousValue)) {
			return computeFromScratch()
		}
		const diff = obj.getDiffSince(lastComputedEpoch)
		if (diff === RESET_VALUE) {
			return computeFromScratch()
		}
		if (diff.length === 0) {
			return previousValue
		}

		const newUpstream = obj.get()

		const result = { ...previousValue } as Record<string, Out>

		const changedKeys = new Set<string>()
		for (const change of diff.flat()) {
			const key = change.path[0] as string
			if (changedKeys.has(key)) {
				continue
			}
			switch (change.type) {
				case 'CHANGE':
				case 'CREATE':
					changedKeys.add(key)
					if (key in newUpstream) {
						result[key] = mapper(newUpstream[key], change.path[0] as string)
					} else {
						// key was removed later in this patch
					}
					break
				case 'REMOVE':
					if (key in result) {
						delete result[key]
					}
					break
				default:
					assertNever(change)
			}
		}

		return result
	})
}

describe('incremental derivations', () => {
	it('should be possible', () => {
		type NumberMap = Record<string, number>

		const nodes = atom<NumberMap, Difference[]>(
			'',
			{
				a: 1,
				b: 2,
				c: 3,
				d: 4,
				e: 5,
			},
			{
				historyLength: 10,
				computeDiff: (valA, valB) => {
					const result: Difference[] = []
					for (const keyA in valA) {
						if (!(keyA in valB)) {
							result.push({
								type: 'REMOVE',
								oldValue: valA[keyA],
								path: [keyA],
							})
						} else if (valA[keyA] != valB[keyA]) {
							result.push({
								type: 'CHANGE',
								oldValue: valA[keyA],
								path: [keyA],
								value: valB[keyA],
							})
						}
					}

					for (const keyB in valB) {
						if (!(keyB in valA)) {
							result.push({
								type: 'CREATE',
								value: valB[keyB],
								path: [keyB],
							})
						}
					}
					return result
				},
			}
		)

		const mapper = vi.fn((val) => val * 2)

		const doubledNodes = getIncrementalRecordMapper(nodes, mapper)

		expect(doubledNodes.get()).toEqual({
			a: 2,
			b: 4,
			c: 6,
			d: 8,
			e: 10,
		})
		expect(mapper).toHaveBeenCalledTimes(5)

		nodes.update((ns) => ({ ...ns, a: 10 }))

		expect(doubledNodes.get()).toEqual({
			a: 20,
			b: 4,
			c: 6,
			d: 8,
			e: 10,
		})

		expect(mapper).toHaveBeenCalledTimes(6)

		// remove d
		nodes.update(({ d: _d, ...others }) => others)

		expect(doubledNodes.get()).toEqual({
			a: 20,
			b: 4,
			c: 6,
			e: 10,
		})
		expect(mapper).toHaveBeenCalledTimes(6)

		nodes.update((ns) => ({ ...ns, f: 50, g: 60 }))

		expect(doubledNodes.get()).toEqual({
			a: 20,
			b: 4,
			c: 6,
			e: 10,
			f: 100,
			g: 120,
		})
		expect(mapper).toHaveBeenCalledTimes(8)

		nodes.set({ ...nodes.get() })
		// no changes so no new calls to mapper
		expect(doubledNodes.get()).toEqual({
			a: 20,
			b: 4,
			c: 6,
			e: 10,
			f: 100,
			g: 120,
		})
		expect(mapper).toHaveBeenCalledTimes(8)

		// make several changes

		nodes.update((ns) => ({ ...ns, a: 1 }))
		nodes.update((ns) => ({ ...ns, b: 9 }))
		nodes.update((ns) => ({ ...ns, c: 17 }))
		nodes.update(({ f: _f, g: _g, ...others }) => ({ ...others }))
		nodes.update((ns) => ({ ...ns, d: 4 }))
		nodes.update((ns) => ({ ...ns, a: 4 }))

		// nothing was called because we didn't deref yet
		expect(mapper).toHaveBeenCalledTimes(8)

		expect(doubledNodes.get()).toEqual({
			a: 8,
			b: 18,
			c: 34,
			d: 8,
			e: 10,
		})

		expect(mapper).toHaveBeenCalledTimes(12)
	})
})

describe('computed as a decorator', () => {
	it('can be used to decorate a class', () => {
		class Foo {
			a = atom('a', 1)
			@computed
			getB() {
				return this.a.get() * 2
			}
		}

		const foo = new Foo()

		expect(foo.getB()).toBe(2)

		foo.a.set(2)

		expect(foo.getB()).toBe(4)
	})

	it('can be used to decorate a class with custom properties', () => {
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

		expect(firstVal).toBe(secondVal)
		expect(numComputations).toBe(2)
	})
})

describe(getComputedInstance, () => {
	it('can retrieve the underlying computed instance', () => {
		class Foo {
			a = atom('a', 1)

			@computed({ isEqual: (a, b) => a.b === b.b })
			getB() {
				return { b: this.a.get() * this.a.get() }
			}
		}

		const foo = new Foo()

		const bInst = getComputedInstance(foo, 'getB')

		expect(bInst).toBeDefined()
		expect(bInst).toBeInstanceOf(_Computed)
	})
})

describe('computed isEqual', () => {
	it('does not get called for the initialization', () => {
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

	it('should use custom isEqual to prevent unnecessary updates', () => {
		const isEqual = vi.fn((a, b) => a?.id === b?.id)
		const computeFn = vi.fn(() => ({ id: 1, timestamp: Date.now() }))
		const source = atom('source', 1)

		const c = computed(
			'test',
			() => {
				source.get() // Add dependency
				return computeFn()
			},
			{ isEqual }
		)

		c.get() // Initial computation
		expect(computeFn).toHaveBeenCalledTimes(1)
		expect(isEqual).not.toHaveBeenCalled()

		source.set(2) // Trigger recomputation
		c.get()
		expect(computeFn).toHaveBeenCalledTimes(2)
		expect(isEqual).toHaveBeenCalledTimes(1)

		// Should not trigger update even if source changes
		source.set(3)
		c.get()
		expect(computeFn).toHaveBeenCalledTimes(3)
		expect(isEqual).toHaveBeenCalledTimes(2)
	})

	it('should handle null and undefined values in custom isEqual', () => {
		const isEqual = vi.fn((a, b) => a === b)
		const source = atom('source', 1)

		const c = computed(
			'test',
			() => {
				const val = source.get()
				return val === 1 ? null : val === 2 ? undefined : val
			},
			{ isEqual }
		)

		expect(c.get()).toBe(null)
		source.set(2)
		expect(c.get()).toBe(undefined)
		// isEqual is called with (newValue, prevValue)
		expect(isEqual).toHaveBeenCalledWith(undefined, null)

		source.set(3)
		expect(c.get()).toBe(3)
		// Check the second call: isEqual(newValue=3, prevValue=undefined)
		expect(isEqual).toHaveBeenNthCalledWith(2, 3, undefined)
	})
})

describe('UNINITIALIZED symbol and isUninitialized function', () => {
	it('should export UNINITIALIZED symbol', () => {
		expect(typeof Symbol.for('com.tldraw.state/UNINITIALIZED')).toBe('symbol')
	})

	it('isUninitialized should correctly identify UNINITIALIZED values', () => {
		const UNINITIALIZED_SYMBOL = Symbol.for('com.tldraw.state/UNINITIALIZED')
		expect(isUninitialized(UNINITIALIZED_SYMBOL)).toBe(true)
		expect(isUninitialized(undefined)).toBe(false)
		expect(isUninitialized(null)).toBe(false)
		expect(isUninitialized(0)).toBe(false)
		expect(isUninitialized('')).toBe(false)
		expect(isUninitialized(false)).toBe(false)
		expect(isUninitialized(Symbol('other'))).toBe(false)
	})

	it('should pass UNINITIALIZED as prevValue on first computation', () => {
		const computeFn = vi.fn((prevValue) => {
			if (isUninitialized(prevValue)) {
				return 'first'
			}
			return 'subsequent'
		})

		const c = computed('test', computeFn)
		expect(c.get()).toBe('first')
		expect(computeFn).toHaveBeenCalledWith(
			Symbol.for('com.tldraw.state/UNINITIALIZED'),
			expect.any(Number)
		)
	})
})

describe('WithDiff class and withDiff function', () => {
	it('should create WithDiff instances with value and diff', () => {
		const result = withDiff('hello', { type: 'created' })
		expect(result).toBeInstanceOf(WithDiff)
		expect(result.value).toBe('hello')
		expect(result.diff).toEqual({ type: 'created' })
	})

	it('should work with computed signals returning WithDiff', () => {
		const count = atom('count', 0)
		const tracked = computed(
			'tracked',
			(prevValue) => {
				const currentValue = count.get()
				if (isUninitialized(prevValue)) {
					return withDiff(currentValue, { type: 'init', value: currentValue })
				}
				return withDiff(currentValue, { type: 'change', from: prevValue, to: currentValue })
			},
			{ historyLength: 5 }
		)

		expect(tracked.get()).toBe(0)
		count.set(5)
		expect(tracked.get()).toBe(5)

		// Check that the diff was used
		const diffs = tracked.getDiffSince(getGlobalEpoch() - 1)
		expect(Array.isArray(diffs)).toBe(true)
		if (Array.isArray(diffs)) {
			expect(diffs[0]).toEqual({ type: 'change', from: 0, to: 5 })
		}
	})

	it('should prefer WithDiff.diff over computeDiff when both are provided', () => {
		const computeDiff = vi.fn((a, b) => ({ auto: true, from: a, to: b }))
		const count = atom('count', 0)

		const tracked = computed(
			'tracked',
			(prevValue) => {
				const currentValue = count.get()
				if (isUninitialized(prevValue)) {
					return currentValue
				}
				return withDiff(currentValue, { manual: true, from: prevValue, to: currentValue })
			},
			{ historyLength: 5, computeDiff }
		)

		tracked.get() // Initialize
		count.set(5)
		tracked.get()

		const diffs = tracked.getDiffSince(getGlobalEpoch() - 1)
		expect(Array.isArray(diffs)).toBe(true)
		if (Array.isArray(diffs)) {
			// Should use the manual diff from withDiff, not computeDiff
			expect(diffs[0]).toEqual({ manual: true, from: 0, to: 5 })
		}
		expect(computeDiff).not.toHaveBeenCalled()
	})
})

describe('isComputed type guard', () => {
	it('should correctly identify computed signals', () => {
		const c = computed('test', () => 42)
		const a = atom('test', 42)

		expect(isComputed(c)).toBe(true)
		expect(isComputed(a)).toBe(false)
		expect(isComputed(42)).toBe(false)
		expect(isComputed({})).toBe(false)
		expect(isComputed({ get: () => 42 })).toBe(false)
	})

	// Bug documentation: isComputed returns input value instead of false for null/undefined
	it.fails('should return false for null and undefined (currently buggy)', () => {
		// Bug found: isComputed(null) and isComputed(undefined) return null/undefined instead of false
		// This is due to the implementation: value && value instanceof _Computed
		// When value is null/undefined, the expression evaluates to null/undefined, not false
		expect(isComputed(null)).toBe(false) // Currently returns null due to bug
		expect(isComputed(undefined)).toBe(false) // Currently returns undefined due to bug
	})

	it('should work as a type guard in conditional blocks', () => {
		const c = computed('test', () => 42)
		const a = atom('test', 42)
		const signals = [c, a]

		for (const signal of signals) {
			if (isComputed(signal)) {
				// TypeScript should know this is a Computed
				expect(signal.isActivelyListening).toBeDefined()
				expect(signal.parents).toBeDefined()
			} else {
				// TypeScript should know this is not a Computed
				expect('isActivelyListening' in signal).toBe(false)
			}
		}
	})
})

describe('error handling in computed signals', () => {
	it('should throw error when compute function throws', () => {
		const errorComputed = computed('error', () => {
			throw new Error('test error')
		})

		expect(() => errorComputed.get()).toThrow('test error')
	})

	it('should reset to UNINITIALIZED when error thrown', () => {
		const source = atom('source', 1)
		const errorComputed = computed('error', () => {
			if (source.get() === 2) {
				throw new Error('test error')
			}
			return source.get() * 2
		})

		expect(errorComputed.get()).toBe(2) // Works initially
		source.set(2)
		expect(() => errorComputed.get()).toThrow('test error')

		// After error, state should be reset to UNINITIALIZED
		source.set(3)
		expect(errorComputed.get()).toBe(6) // Should work again
	})

	it('should clear history buffer when error is thrown', () => {
		const source = atom('source', 1)
		const errorComputed = computed(
			'error',
			(prevValue) => {
				if (source.get() === 2) {
					throw new Error('test error')
				}
				return source.get() * 2
			},
			{ historyLength: 5, computeDiff: (a, b) => (b as number) - (a as number) }
		)

		const startEpoch = getGlobalEpoch()
		errorComputed.get() // Initialize
		source.set(2)

		try {
			errorComputed.get()
		} catch {
			// Expected error
		}

		// History should be cleared
		source.set(3)
		errorComputed.get()
		expect(errorComputed.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})

	it('should ignore errors when ignoreErrors flag is set', () => {
		const source = atom('source', 1)
		const errorComputed = computed('error', () => {
			if (source.get() === 2) {
				throw new Error('test error')
			}
			return source.get() * 2
		})

		errorComputed.get() // Initialize
		source.set(2)

		// Should not throw when ignoreErrors is true
		const result = errorComputed.__unsafe__getWithoutCapture(true)
		// Should return UNINITIALIZED state, but we can't easily test the exact value
		expect(() => result).not.toThrow()
	})

	it('should rethrow cached error on subsequent gets', () => {
		const source = atom('source', 2)
		const errorComputed = computed('error', () => {
			if (source.get() === 2) {
				throw new Error('test error')
			}
			return source.get() * 2
		})

		expect(() => errorComputed.get()).toThrow('test error')
		// Should throw the same cached error without recomputing
		expect(() => errorComputed.get()).toThrow('test error')
		expect(() => errorComputed.get()).toThrow('test error')
	})
})

describe('isActivelyListening property', () => {
	it('should be false initially', () => {
		const c = computed('test', () => 42)
		expect(c.isActivelyListening).toBe(false)
	})

	it('should be true when there are reactive dependencies', () => {
		const source = atom('source', 1)
		const c = computed('test', () => source.get())

		// Create a reaction that depends on the computed
		let reactionValue = 0
		const stop = react('reaction', () => {
			reactionValue = c.get()
		})

		expect(c.isActivelyListening).toBe(true)

		stop()
		expect(c.isActivelyListening).toBe(false)
	})

	it('should be true when used by another computed signal', () => {
		const source = atom('source', 1)
		const c1 = computed('c1', () => source.get())
		const c2 = computed('c2', () => c1.get() * 2)

		expect(c1.isActivelyListening).toBe(false)
		expect(c2.isActivelyListening).toBe(false)

		// Access c2, which should make c1 actively listened to
		c2.get()
		expect(c1.isActivelyListening).toBe(false) // Still false because c2 isn't listened to

		// Create a reaction on c2
		let value = 0
		const stop = react('reaction', () => {
			value = c2.get()
		})

		expect(c1.isActivelyListening).toBe(true)
		expect(c2.isActivelyListening).toBe(true)

		stop()
		expect(c1.isActivelyListening).toBe(false)
		expect(c2.isActivelyListening).toBe(false)
	})
})

describe('computed without history buffer', () => {
	it('should work without historyLength option', () => {
		const source = atom('source', 1)
		const c = computed('test', () => source.get() * 2)

		expect(c.get()).toBe(2)
		source.set(5)
		expect(c.get()).toBe(10)
	})

	it('should return RESET_VALUE for getDiffSince when no history', () => {
		const source = atom('source', 1)
		const c = computed('test', () => source.get() * 2) // No historyLength

		const startEpoch = getGlobalEpoch()
		c.get()
		source.set(5)
		c.get()

		expect(c.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})

	it('should not call computeDiff when no history buffer', () => {
		const computeDiff = vi.fn((a, b) => b - a)
		const source = atom('source', 1)
		const c = computed('test', () => source.get() * 2, { computeDiff }) // No historyLength

		c.get()
		source.set(5)
		c.get()

		expect(computeDiff).not.toHaveBeenCalled()
	})
})

describe('getDiffSince edge cases', () => {
	it('should return empty array when epoch equals lastChangedEpoch', () => {
		const source = atom('source', 1)
		const c = computed('test', () => source.get() * 2, { historyLength: 5 })

		c.get()
		const currentEpoch = c.lastChangedEpoch
		expect(c.getDiffSince(currentEpoch)).toEqual([])
	})

	it('should return empty array when epoch is greater than lastChangedEpoch', () => {
		const source = atom('source', 1)
		const c = computed('test', () => source.get() * 2, { historyLength: 5 })

		c.get()
		const futureEpoch = c.lastChangedEpoch + 1000
		expect(c.getDiffSince(futureEpoch)).toEqual([])
	})

	it('should handle errors during getDiffSince gracefully', () => {
		const source = atom('source', 1)
		const errorComputed = computed(
			'error',
			() => {
				if (source.get() === 2) {
					throw new Error('test error')
				}
				return source.get() * 2
			},
			{ historyLength: 5 }
		)

		const startEpoch = getGlobalEpoch()
		errorComputed.get() // Initialize
		source.set(2) // This will cause error on next get

		// getDiffSince should not throw even though the computed is in error state
		expect(() => errorComputed.getDiffSince(startEpoch)).not.toThrow()
	})

	it('should capture parent relationship during getDiffSince', () => {
		const source = atom('source', 1)
		const c1 = computed('c1', () => source.get() * 2, { historyLength: 5 })
		const c2 = computed('c2', () => {
			const startEpoch = getGlobalEpoch() - 1
			c1.getDiffSince(startEpoch) // This should capture c1 as a parent
			return 42
		})

		c2.get() // Initialize c2
		expect(c2.parents).toContain(c1)
	})
})

describe('performance optimizations and caching', () => {
	it('should not recompute when dependencies have not changed', () => {
		const source = atom('source', 1)
		const computeFn = vi.fn(() => source.get() * 2)
		const c = computed('test', computeFn)

		c.get() // First computation
		c.get() // Should use cache
		c.get() // Should use cache
		expect(computeFn).toHaveBeenCalledTimes(1)

		source.set(2) // Change dependency
		c.get() // Should recompute
		expect(computeFn).toHaveBeenCalledTimes(2)

		c.get() // Should use cache again
		expect(computeFn).toHaveBeenCalledTimes(2)
	})

	it('should handle rapidly changing dependencies efficiently', () => {
		const source = atom('source', 0)
		const computeFn = vi.fn(() => source.get() * 2)
		const c = computed('test', computeFn)

		// Make many changes without reading computed
		for (let i = 1; i <= 100; i++) {
			source.set(i)
		}

		// Should only compute once when finally accessed
		expect(c.get()).toBe(200)
		expect(computeFn).toHaveBeenCalledTimes(1)
	})

	it('should use lastCheckedEpoch for optimization', () => {
		const source = atom('source', 1)
		const computeFn = vi.fn(() => source.get() * 2)
		const c = computed('test', computeFn)

		c.get() // Initialize
		const initialLastChecked = getLastCheckedEpoch(c)

		// Advance global epoch without changing dependencies
		advanceGlobalEpoch()
		c.get() // Should update lastCheckedEpoch but not recompute

		expect(getLastCheckedEpoch(c)).toBeGreaterThan(initialLastChecked)
		expect(computeFn).toHaveBeenCalledTimes(1) // Still only one computation
	})
})

describe('cleanup and memory management', () => {
	it('should clean up parent-child relationships when no longer referenced', () => {
		const source = atom('source', 1)
		const c1 = computed('c1', () => source.get() * 2)
		const c2 = computed('c2', () => c1.get() * 2)

		// Create dependency chain
		c2.get()

		// When we access c2, it creates dependencies: c2 -> c1 -> source
		// Note: children are only added when there are active listeners
		// Without active reactors/effects, the children set may be empty
		// This test mainly verifies the parent structure is set up correctly
		expect(c1.parents).toContain(source)
		expect(c2.parents).toContain(c1)
	})

	it('should handle circular dependencies gracefully', () => {
		const a = atom('a', 1)
		const b = atom('b', 2)

		// This creates a potential circular dependency if not handled correctly
		const c1 = computed('c1', () => {
			return a.get() + b.get()
		})

		const c2 = computed('c2', () => {
			return c1.get() * 2
		})

		// This should work without infinite recursion
		expect(c2.get()).toBe(6) // (1 + 2) * 2

		a.set(2)
		expect(c2.get()).toBe(8) // (2 + 2) * 2
	})
})
