import { atom, isAtom } from '../Atom'
import { computed } from '../Computed'
import { reactor } from '../EffectScheduler'
import { getGlobalEpoch, transact, transaction } from '../transactions'
import { RESET_VALUE } from '../types'

describe('atoms', () => {
	it('contain data', () => {
		const a = atom('', 1)

		expect(a.get()).toBe(1)
	})
	it('can be updated', () => {
		const a = atom('', 1)

		a.set(2)

		expect(a.get()).toBe(2)
	})
	it('will not advance the global epoch on creation', () => {
		const startEpoch = getGlobalEpoch()
		atom('', 3)
		expect(getGlobalEpoch()).toBe(startEpoch)
	})
	it('will advance the global epoch on .set', () => {
		const startEpoch = getGlobalEpoch()
		const a = atom('', 3)
		a.set(4)
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
	})
	it('can store history', () => {
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
	it('has history independent of other atoms', () => {
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
	it('still updates history during transactions', () => {
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
	it('will clear the history if the transaction aborts', () => {
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
	it('supports an update operation', () => {
		const startEpoch = getGlobalEpoch()
		const a = atom('', 1)

		a.update((value) => value + 1)

		expect(a.get()).toBe(2)
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
	})
	it('supports passing diffs in .set', () => {
		const a = atom('', 1, { historyLength: 3 })

		const startEpoch = getGlobalEpoch()

		a.set(5, +4)
		expect(a.getDiffSince(startEpoch)).toEqual([+4])

		a.set(6, +1)
		expect(a.getDiffSince(startEpoch)).toEqual([+4, +1])
	})
	it('does not push history if nothing changed', () => {
		const a = atom('', 1, { historyLength: 3 })

		const startEpoch = getGlobalEpoch()

		a.set(5, +4)
		expect(a.getDiffSince(startEpoch)).toEqual([+4])
		a.set(5, +4)
		expect(a.getDiffSince(startEpoch)).toEqual([+4])
	})
	it('clears the history buffer if you fail to provide a diff', () => {
		const a = atom('', 1, { historyLength: 3 })
		const startEpoch = getGlobalEpoch()

		a.set(5, +4)

		expect(a.getDiffSince(startEpoch)).toEqual([+4])

		a.set(6)

		expect(a.getDiffSince(startEpoch)).toEqual(RESET_VALUE)
	})
})

describe('reacting to atoms', () => {
	it('should work', async () => {
		const a = atom('', 234)

		let val = 0
		const r = reactor('', () => {
			val = a.get()
		})

		expect(val).toBe(0)

		r.start()

		expect(val).toBe(234)

		a.set(939)

		expect(val).toBe(939)

		r.stop()

		a.set(2342)

		expect(val).toBe(939)
		expect(a.get()).toBe(2342)
	})
})

test('isEqual can provide custom equality checks', () => {
	const foo = { hello: true }
	const bar = { hello: true }

	const a = atom('a', foo)

	a.set(bar)

	expect(a.get()).toBe(bar)

	const b = atom('b', foo, { isEqual: (a, b) => a.hello === b.hello })

	b.set(bar)

	expect(b.get()).toBe(foo)
})

describe('isAtom', () => {
	it('distinguishes atoms from other values', () => {
		const a = atom('test', 42)
		const c = computed('c', () => a.get() * 2)

		expect(isAtom(a)).toBe(true)
		expect(isAtom(c)).toBe(false)
		expect(isAtom({})).toBe(false)
		expect(isAtom(null)).toBe(false)
	})
})

describe('atom with custom isEqual', () => {
	it('uses custom equality to prevent unnecessary updates', () => {
		const obj1 = { id: 1, data: 'test' }
		const obj2 = { id: 1, data: 'different' } // Same ID, different data

		const a = atom('custom-equal', obj1, {
			isEqual: (a, b) => a.id === b.id,
		})

		const startEpoch = getGlobalEpoch()
		a.set(obj2)

		// Should not advance epoch due to custom equality
		expect(getGlobalEpoch()).toBe(startEpoch)
		expect(a.get()).toBe(obj1) // Should keep original
	})
})

describe('atom history edge cases', () => {
	it('handles history with historyLength of 1', () => {
		const a = atom('test', 1, {
			historyLength: 1,
			computeDiff: (a, b) => b - a,
		})
		const startEpoch = getGlobalEpoch()

		a.set(2)
		expect(a.getDiffSince(startEpoch)).toEqual([1])

		a.set(3)
		// Should only keep the most recent diff
		expect(a.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})

	it('handles history with no computeDiff function', () => {
		const a = atom('test', 1, { historyLength: 3 }) // No computeDiff provided
		const startEpoch = getGlobalEpoch()

		a.set(2)
		// Without computeDiff, should use RESET_VALUE for diffs
		expect(a.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})

	it('handles computeDiff function that returns RESET_VALUE', () => {
		const a = atom('test', 1, {
			historyLength: 3,
			computeDiff: () => RESET_VALUE, // Always returns RESET_VALUE
		})
		const startEpoch = getGlobalEpoch()

		a.set(2)
		expect(a.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})

	it('handles manual diff provision with set', () => {
		const a = atom('test', 1, { historyLength: 3 })
		const startEpoch = getGlobalEpoch()

		// Providing diff manually should store it
		a.set(5, { type: 'increment', amount: 4 })
		expect(a.getDiffSince(startEpoch)).toEqual([{ type: 'increment', amount: 4 }])

		// Not providing diff should use RESET_VALUE
		a.set(6)
		expect(a.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})
})

describe('atom update method', () => {
	it('calls updater with current value', () => {
		const a = atom('test', 10)

		let capturedValue: number | undefined
		a.update((currentValue) => {
			capturedValue = currentValue
			return currentValue * 2
		})

		expect(capturedValue).toBe(10)
		expect(a.get()).toBe(20)
	})

	it('does not advance epoch if updater returns same value', () => {
		const a = atom('test', 42)
		const startEpoch = getGlobalEpoch()

		a.update((value) => value) // Return same value
		expect(getGlobalEpoch()).toBe(startEpoch)
		expect(a.get()).toBe(42)
	})

	it('handles updater that throws', () => {
		const a = atom('test', 42)
		const startEpoch = getGlobalEpoch()

		expect(() => {
			a.update(() => {
				throw new Error('Updater error')
			})
		}).toThrow('Updater error')

		// Value should remain unchanged
		expect(a.get()).toBe(42)
		// Epoch should not have advanced
		expect(getGlobalEpoch()).toBe(startEpoch)
	})

	it('works with complex updater logic', () => {
		const a = atom('array', [1, 2, 3])

		a.update((arr) => [...arr, 4])
		expect(a.get()).toEqual([1, 2, 3, 4])

		a.update((arr) => arr.filter((x) => x % 2 === 0))
		expect(a.get()).toEqual([2, 4])
	})
})

describe('atom getDiffSince', () => {
	it('returns empty array when no changes since epoch', () => {
		const a = atom('test', 1, { historyLength: 3, computeDiff: (a, b) => b - a })
		const currentEpoch = getGlobalEpoch()

		// No changes since current epoch
		expect(a.getDiffSince(currentEpoch)).toEqual([])

		// No changes since future epoch
		expect(a.getDiffSince(currentEpoch + 1000)).toEqual([])
	})

	it('handles epoch exactly at lastChangedEpoch', () => {
		const a = atom('test', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		a.set(2)
		const changeEpoch = a.lastChangedEpoch

		// Requesting diffs from exactly when it changed should return empty
		expect(a.getDiffSince(changeEpoch)).toEqual([])

		// But from before the change should include the diff
		expect(a.getDiffSince(changeEpoch - 1)).toEqual([1])
	})

	it('works with atoms that have no history buffer', () => {
		const a = atom('no-history', 1) // No historyLength
		const startEpoch = getGlobalEpoch()

		a.set(2)
		expect(a.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})
})
