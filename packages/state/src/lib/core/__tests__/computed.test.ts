import { atom } from '../Atom'
import { Computed, _Computed, computed, getComputedInstance, isUninitialized } from '../Computed'
import { reactor } from '../EffectScheduler'
import { assertNever } from '../helpers'
import { advanceGlobalEpoch, globalEpoch, transact, transaction } from '../transactions'
import { RESET_VALUE, Signal } from '../types'

function getLastCheckedEpoch(derivation: Computed<any>): number {
	return (derivation as any).lastCheckedEpoch
}

describe('derivations', () => {
	it('will cache a value forever if it has no parents', () => {
		const derive = jest.fn(() => 1)
		const startEpoch = globalEpoch
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
		const double = jest.fn(() => a.get() * 2)
		const derivation = computed('', double)
		const startEpoch = globalEpoch
		expect(double).toHaveBeenCalledTimes(0)

		expect(derivation.get()).toBe(2)
		expect(double).toHaveBeenCalledTimes(1)

		expect(derivation.lastChangedEpoch).toBe(startEpoch)

		expect(derivation.get()).toBe(2)
		expect(derivation.get()).toBe(2)
		expect(double).toHaveBeenCalledTimes(1)
		expect(derivation.lastChangedEpoch).toBe(startEpoch)

		a.set(2)
		const nextEpoch = globalEpoch
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
		const startEpoch = globalEpoch
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
		const startEpoch = globalEpoch
		const a = atom('', 1)

		const floor = jest.fn((n: number) => Math.floor(n))
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
		const startEpoch = globalEpoch
		const a = atom('', 1)

		const double = jest.fn(() => a.get() * 2)
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
		const double = jest.fn((_prevValue) => a.get() * 2)
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
		const double = jest.fn((_prevValue, lastChangedEpoch) => {
			expect(lastChangedEpoch).toBe(derivation.lastChangedEpoch)
			return a.get() * 2
		})
		const derivation = computed('', double)

		expect(derivation.get()).toBe(2)

		const startEpoch = globalEpoch

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

		const startEpoch = globalEpoch

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

		expect(c.getDiffSince(globalEpoch - 1)).toEqual(RESET_VALUE)
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

		const mapper = jest.fn((val) => val * 2)

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
		const isEqual = jest.fn((a, b) => a === b)

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
})
