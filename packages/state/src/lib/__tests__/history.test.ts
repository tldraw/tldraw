import { vi } from 'vitest'
import { atom } from '../Atom'
import { Computed, UNINITIALIZED, computed, isUninitialized, withDiff } from '../Computed'
import { react } from '../EffectScheduler'
import { EMPTY_ARRAY, assertNever } from '../helpers'
import { getGlobalEpoch, transact, transaction } from '../transactions'
import { RESET_VALUE, Signal } from '../types'

// Tests for SPEC.md §8 (history and diffs).
// Rule IDs like [H2] in test names refer to that document.

describe('atom history (H)', () => {
	it('[H1] only exists when historyLength is provided', () => {
		const computeDiff = vi.fn((a: number, b: number) => b - a)
		const a = atom<number, number>('', 1, { computeDiff })

		const startEpoch = getGlobalEpoch()

		a.set(2)

		expect(computeDiff).not.toHaveBeenCalled()
		expect(a.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})

	it('[H2][H5] records computeDiff diffs and returns RESET_VALUE when the buffer is exceeded', () => {
		const a = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		const startEpoch = getGlobalEpoch()

		expect(a.getDiffSince(startEpoch)).toEqual([])

		a.set(5)

		expect(a.getDiffSince(startEpoch)).toEqual([+4])

		a.set(10)

		expect(a.getDiffSince(startEpoch)).toEqual([+4, +5])

		a.set(20)

		expect(a.getDiffSince(startEpoch)).toEqual([+4, +5, +10])

		a.set(30)

		// will be RESET_VALUE because we don't have enough history
		expect(a.getDiffSince(startEpoch)).toEqual(RESET_VALUE)
	})

	it('[H2] prefers an explicit diff passed to set over computeDiff', () => {
		const computeDiff = vi.fn((a: number, b: number) => b - a)
		const a = atom<number, number>('', 1, { historyLength: 3, computeDiff })

		const startEpoch = getGlobalEpoch()

		a.set(5, +100)
		expect(computeDiff).not.toHaveBeenCalled()
		expect(a.getDiffSince(startEpoch)).toEqual([+100])

		a.set(6)
		expect(computeDiff).toHaveBeenCalledTimes(1)
		expect(a.getDiffSince(startEpoch)).toEqual([+100, +1])
	})

	it('[H2] passes the previous and current epochs to computeDiff', () => {
		const calls: Array<[number, number, number, number]> = []
		const a = atom('', 1, {
			historyLength: 3,
			computeDiff: (prev, next, lastEpoch, currentEpoch) => {
				calls.push([prev, next, lastEpoch, currentEpoch])
				return next - prev
			},
		})

		const epochBeforeSet = a.lastChangedEpoch
		a.set(5)

		expect(calls).toEqual([[1, 5, epochBeforeSet, getGlobalEpoch()]])
	})

	it('[H4] clears the history buffer if no diff can be determined', () => {
		const a = atom('', 1, { historyLength: 3 })
		const startEpoch = getGlobalEpoch()

		a.set(5, +4)

		expect(a.getDiffSince(startEpoch)).toEqual([+4])

		// no explicit diff and no computeDiff: the diff is RESET_VALUE, which wipes history
		a.set(6)

		expect(a.getDiffSince(startEpoch)).toEqual(RESET_VALUE)
	})

	it('[H5] returns the shared EMPTY_ARRAY instance when nothing changed since the epoch', () => {
		const a = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		a.set(2)

		expect(a.getDiffSince(getGlobalEpoch())).toBe(EMPTY_ARRAY)
	})

	it('[H6] getDiffSince captures the signal as a dependency', () => {
		const a = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		const effect = vi.fn((lastReactedEpoch: number) => {
			a.getDiffSince(lastReactedEpoch)
		})
		const stop = react('r', effect)

		expect(effect).toHaveBeenCalledTimes(1)

		a.set(2)

		expect(effect).toHaveBeenCalledTimes(2)
		stop()
	})

	it('[A6] is independent of other atoms’ history', () => {
		const a = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })
		const b = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		const startEpoch = getGlobalEpoch()

		b.set(-5)
		b.set(-10)
		b.set(-20)
		expect(b.getDiffSince(startEpoch)).toEqual([-6, -5, -10])
		expect(b.getDiffSince(getGlobalEpoch())).toEqual([])

		expect(a.getDiffSince(startEpoch)).toEqual([])
		a.set(5)
		expect(a.getDiffSince(startEpoch)).toEqual([+4])
		expect(b.getDiffSince(startEpoch)).toEqual([-6, -5, -10])
		expect(b.getDiffSince(getGlobalEpoch())).toEqual([])
	})

	it('[H7] keeps recording inside transactions', () => {
		const a = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		const startEpoch = getGlobalEpoch()

		transact(() => {
			expect(a.getDiffSince(startEpoch)).toEqual([])

			a.set(5)

			expect(a.getDiffSince(startEpoch)).toEqual([+4])

			a.set(10)

			expect(a.getDiffSince(startEpoch)).toEqual([+4, +5])

			a.set(20)

			expect(a.getDiffSince(startEpoch)).toEqual([+4, +5, +10])
		})

		expect(a.getDiffSince(startEpoch)).toEqual([+4, +5, +10])
	})

	it('[H7][T9] is cleared when a transaction aborts', () => {
		const a = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		const startEpoch = getGlobalEpoch()

		transaction((rollback) => {
			expect(a.getDiffSince(startEpoch)).toEqual([])

			a.set(5)

			expect(a.getDiffSince(startEpoch)).toEqual([+4])

			rollback()
		})

		expect(a.getDiffSince(startEpoch)).toEqual(RESET_VALUE)
	})
})

describe('computed history (H)', () => {
	it('[H3][H5] records computeDiff diffs and returns RESET_VALUE when the buffer is exceeded', () => {
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
		// should fail now because we don't have enough history
		expect(derivation.getDiffSince(startEpoch)).toEqual(RESET_VALUE)
	})

	it('[H3][H8] prefers a withDiff diff over computeDiff, and get() unwraps the value', () => {
		const a = atom('', 1)
		const computeDiff = vi.fn((prev: number, next: number) => next - prev)

		const derivation = computed(
			'',
			(prev: number | UNINITIALIZED) => {
				const next = a.get() * 2
				if (isUninitialized(prev)) return next
				return withDiff(next, `+${next - prev}`)
			},
			{ historyLength: 3, computeDiff: computeDiff as any }
		)

		expect(derivation.get()).toBe(2)

		const startEpoch = getGlobalEpoch()

		a.set(2)

		expect(derivation.get()).toBe(4)
		expect(derivation.getDiffSince(startEpoch)).toEqual(['+2'])
		expect(computeDiff).not.toHaveBeenCalled()

		a.set(5)

		expect(derivation.get()).toBe(10)
		expect(derivation.getDiffSince(startEpoch)).toEqual(['+2', '+6'])
		expect(computeDiff).not.toHaveBeenCalled()
	})

	it('[H3] records no history entry for the first computation', () => {
		const a = atom('', 1)
		const derivation = computed('', () => a.get() * 2, {
			historyLength: 3,
			computeDiff: (a, b) => b - a,
		})

		const startEpoch = getGlobalEpoch()
		expect(derivation.get()).toBe(2)
		expect(derivation.getDiffSince(startEpoch)).toEqual([])
	})

	it('[C5] does not record history when the recomputed value is equal', () => {
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

		a.set(1.9)

		expect(derivation.get()).toBe(1)
		expect(derivation.getDiffSince(startEpoch)).toHaveLength(0)
		expect(floor).toHaveBeenCalledTimes(3)

		a.set(2.3)

		expect(derivation.get()).toBe(2)
		expect(derivation.getDiffSince(startEpoch)).toEqual([+1])
		expect(floor).toHaveBeenCalledTimes(4)
	})

	it('[H7] is not cleared by an aborted transaction: the round trip is recorded as ordinary entries', () => {
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

	it('[H5] returns RESET_VALUE for an epoch before the first computation', () => {
		const a = atom('', 1)
		const b = atom('', 1)

		const c = computed('', () => a.get() + b.get(), {
			historyLength: 3,
			computeDiff: (a, b) => b - a,
		})

		expect(c.getDiffSince(getGlobalEpoch() - 1)).toEqual(RESET_VALUE)
	})
})

// The incremental computation pattern that the history system exists to support:
// a derived record map that applies upstream diffs instead of recomputing from scratch.
// This exercises [C4], [H5], and [H6] together.

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
	it('[C4][H5][H6] can apply upstream diffs instead of recomputing from scratch', () => {
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
