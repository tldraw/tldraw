import { atom } from '../Atom'
import { computed, isUninitialized } from '../Computed'
import { EffectScheduler, react } from '../EffectScheduler'
import { haveParentsChanged } from '../helpers'
import { getGlobalEpoch, transact } from '../transactions'
import { RESET_VALUE } from '../types'

// Tests for SPEC.md §7 (errors in computed signals) and rule CE6 (effects that throw).
// Rule IDs like [CE1] in test names refer to that document.

describe('computed signals that throw (CE)', () => {
	it('[CE1] cache thrown values until a parent changes', () => {
		let numComputations = 0
		const a = atom('', 1)
		const b = computed('', () => {
			numComputations++
			if (a.get() === 2) throw new Error('test')
			return a.get()
		})

		expect(b.get()).toBe(1)
		expect(numComputations).toBe(1)

		a.set(2)

		expect(() => b.get()).toThrowErrorMatchingInlineSnapshot(`[Error: test]`)
		expect(numComputations).toBe(2)
		expect(() => b.get()).toThrowErrorMatchingInlineSnapshot(`[Error: test]`)
		expect(numComputations).toBe(2)
		expect(() => b.get()).toThrowErrorMatchingInlineSnapshot(`[Error: test]`)
		expect(numComputations).toBe(2)

		a.set(3)

		expect(b.get()).toBe(3)
		expect(b.get()).toBe(3)
	})

	it('[CE2] entering the error state notifies effects, but consecutive errors do not', () => {
		const a = atom('', 1)
		let numComputations = 0
		const b = computed('', () => {
			numComputations++
			if (a.get() % 2 === 0) throw new Error('test')
			return a.get()
		})

		let numReactions = 0
		react('', () => {
			try {
				b.get()
			} catch {
				// ignore
			}
			numReactions++
		})
		expect(numReactions).toBe(1)
		expect(numComputations).toBe(1)

		a.set(2)

		// entering the error state is a change
		expect(numReactions).toBe(2)
		expect(numComputations).toBe(2)

		a.set(4)

		// erroring again while already in the error state is not a change
		expect(numComputations).toBe(3)
		expect(numReactions).toBe(2)

		a.set(3)

		// recovering is a change
		expect(numComputations).toBe(4)
		expect(numReactions).toBe(3)
	})

	it('[CE3] discard the previous value: recovery receives UNINITIALIZED as previousValue', () => {
		const a = atom('', 1)
		const previousValues: unknown[] = []
		const b = computed('', (prev) => {
			previousValues.push(prev)
			if (a.get() === 2) throw new Error('test')
			return a.get()
		})

		expect(b.get()).toBe(1)

		a.set(2)
		expect(() => b.get()).toThrowErrorMatchingInlineSnapshot(`[Error: test]`)

		a.set(3)
		expect(b.get()).toBe(3)

		expect(previousValues.map(isUninitialized)).toEqual([true, false, true])
		expect(previousValues[1]).toBe(1)
	})

	it('[CE4] clear the history buffer when an error is thrown', () => {
		const a = atom('', 1)
		const b = computed(
			'',
			() => {
				if (a.get() === 5) throw new Error('test')
				return a.get()
			},
			{
				historyLength: 10,
				computeDiff: (a, b) => {
					return b - a
				},
			}
		)

		expect(b.get()).toBe(1)
		const startEpoch = getGlobalEpoch()

		a.set(2)
		expect(b.get()).toBe(2)
		expect(b.getDiffSince(startEpoch)).toEqual([1])

		a.set(4)
		expect(b.get()).toBe(4)
		expect(b.getDiffSince(startEpoch)).toEqual([1, 2])

		a.set(5)

		expect(() => b.get()).toThrowErrorMatchingInlineSnapshot(`[Error: test]`)
		expect(b.getDiffSince(startEpoch)).toEqual(RESET_VALUE)
		const errorEpoch = getGlobalEpoch()

		a.set(6)
		expect(b.get()).toBe(6)
		expect(b.getDiffSince(errorEpoch)).toEqual(RESET_VALUE)
		expect(b.getDiffSince(errorEpoch + 1)).toEqual([])

		a.set(7)
		expect(b.get()).toBe(7)
		expect(b.getDiffSince(errorEpoch)).toEqual(RESET_VALUE)
		expect(b.getDiffSince(errorEpoch + 1)).toEqual([1])
	})

	it('[CE5] haveParentsChanged will not throw if one of the parents is throwing', () => {
		const a = atom('', 1)
		const scheduler = new EffectScheduler('', () => {
			a.get()
			throw new Error('test')
		})
		expect(() => {
			scheduler.attach()
			scheduler.execute()
		}).toThrowErrorMatchingInlineSnapshot(`[Error: test]`)

		expect(haveParentsChanged(scheduler)).toBe(false)

		expect(() => a.set(2)).toThrowErrorMatchingInlineSnapshot(`[Error: test]`)

		// haveParentsChanged should still be false because it already
		// executed the effect and it errored
		expect(haveParentsChanged(scheduler)).toBe(false)
	})
})

describe('effects that throw (CE6)', () => {
	it('[CE6] will not roll back the atom value', () => {
		const a = atom('', 1)
		react('', () => {
			if (a.get() === 2) throw new Error('test')
		})
		expect(() => a.set(2)).toThrowErrorMatchingInlineSnapshot(`[Error: test]`)
		expect(a.get()).toBe(2)
	})

	it('[CE6] will not roll back the changes in a transaction', () => {
		const a = atom('', 1)
		const b = atom('', 2)

		react('', () => {
			if (a.get() + b.get() === 4) throw new Error('test')
		})

		expect(() =>
			transact(() => {
				a.set(3)
				b.set(1)
			})
		).toThrowErrorMatchingInlineSnapshot(`[Error: test]`)

		expect(a.get()).toBe(3)
		expect(b.get()).toBe(1)
	})
})
