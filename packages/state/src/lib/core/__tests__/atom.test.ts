import { atom } from '../Atom'
import { reactor } from '../EffectScheduler'
import { globalEpoch, transact, transaction } from '../transactions'
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
		const startEpoch = globalEpoch
		atom('', 3)
		expect(globalEpoch).toBe(startEpoch)
	})
	it('will advance the global epoch on .set', () => {
		const startEpoch = globalEpoch
		const a = atom('', 3)
		a.set(4)
		expect(globalEpoch).toBe(startEpoch + 1)
	})
	it('can store history', () => {
		const a = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		const startEpoch = globalEpoch

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

		const startEpoch = globalEpoch

		b.set(-5)
		b.set(-10)
		b.set(-20)
		expect(b.getDiffSince(startEpoch)).toEqual([-6, -5, -10])
		expect(b.getDiffSince(globalEpoch)).toEqual([])

		expect(a.getDiffSince(startEpoch)).toEqual([])
		a.set(5)
		expect(a.getDiffSince(startEpoch)).toEqual([+4])
		expect(b.getDiffSince(startEpoch)).toEqual([-6, -5, -10])
		expect(b.getDiffSince(globalEpoch)).toEqual([])
	})
	it('still updates history during transactions', () => {
		const a = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		const startEpoch = globalEpoch

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

		const startEpoch = globalEpoch

		transaction((rollback) => {
			expect(a.getDiffSince(startEpoch)).toEqual([])

			a.set(5)

			expect(a.getDiffSince(startEpoch)).toEqual([+4])

			rollback()
		})

		expect(a.getDiffSince(startEpoch)).toEqual(RESET_VALUE)
	})
	it('supports an update operation', () => {
		const startEpoch = globalEpoch
		const a = atom('', 1)

		a.update((value) => value + 1)

		expect(a.get()).toBe(2)
		expect(globalEpoch).toBe(startEpoch + 1)
	})
	it('supports passing diffs in .set', () => {
		const a = atom('', 1, { historyLength: 3 })

		const startEpoch = globalEpoch

		a.set(5, +4)
		expect(a.getDiffSince(startEpoch)).toEqual([+4])

		a.set(6, +1)
		expect(a.getDiffSince(startEpoch)).toEqual([+4, +1])
	})
	it('does not push history if nothing changed', () => {
		const a = atom('', 1, { historyLength: 3 })

		const startEpoch = globalEpoch

		a.set(5, +4)
		expect(a.getDiffSince(startEpoch)).toEqual([+4])
		a.set(5, +4)
		expect(a.getDiffSince(startEpoch)).toEqual([+4])
	})
	it('clears the history buffer if you fail to provide a diff', () => {
		const a = atom('', 1, { historyLength: 3 })
		const startEpoch = globalEpoch

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
