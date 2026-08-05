import { vi } from 'vitest'
import { atom } from '../Atom'
import { computed } from '../Computed'
import { react, reactor } from '../EffectScheduler'
import { transact, transaction } from '../transactions'

// Tests for SPEC.md §10 (change propagation and the reaction phase).
// Rule IDs like [P4] in test names refer to that document.

describe('change propagation (P)', () => {
	it('[P1] runs effects synchronously, before set returns', () => {
		const a = atom('', 1)
		let observed = 0

		react('', () => {
			observed = a.get()
		})

		a.set(2)
		expect(observed).toBe(2)
	})

	it('[P2] reaches effects through chains of computeds, but only along listening edges', () => {
		const a = atom('', 1)
		const double = vi.fn(() => a.get() * 2)
		const c1 = computed('', double)
		const c2 = computed('', () => c1.get() + 1)

		let last = 0
		const stop = react('', () => {
			last = c2.get()
		})

		expect(last).toBe(3)

		a.set(2)
		expect(last).toBe(5)

		stop()

		// with nothing listening, changes do not propagate (and computeds stay lazy)
		a.set(3)
		expect(last).toBe(5)
		expect(double).toHaveBeenCalledTimes(2)
	})

	it('[P3] runs an effect once per change in a diamond-shaped graph', () => {
		const a = atom('', 1)
		const left = computed('', () => a.get() + 1)
		const right = computed('', () => a.get() * 2)

		const effect = vi.fn(() => {
			left.get()
			right.get()
		})
		react('', effect)

		expect(effect).toHaveBeenCalledTimes(1)

		a.set(2)

		expect(effect).toHaveBeenCalledTimes(2)
	})
})

describe('setting atoms during the reaction phase (P)', () => {
	it('[P4] works', () => {
		const a = atom('', 0)
		const b = atom('', 0)

		react('', () => {
			b.set(a.get() + 1)
		})

		expect(a.get()).toBe(0)
		expect(b.get()).toBe(1)
	})

	it('[P5] throws an error if it gets into a loop', () => {
		expect(() => {
			const a = atom('', 0)

			react('', () => {
				a.set(a.get() + 1)
			})
		}).toThrowErrorMatchingInlineSnapshot(`[Error: Reaction update depth limit exceeded]`)
	})

	it('[P5] throws when a reactor can not stop setting atom values', () => {
		const a = atom('', 1)
		const r = reactor('', () => {
			if (a.get() < +Infinity) {
				a.update((a) => a + 1)
			}
		})
		expect(() => r.start()).toThrowErrorMatchingInlineSnapshot(
			`[Error: Reaction update depth limit exceeded]`
		)
	})

	it('[P4][P6] works with a transaction running', () => {
		const a = atom('', 0)

		react('', () => {
			transact(() => {
				if (a.get() < 10) {
					a.set(a.get() + 1)
				}
			})
		})

		expect(a.get()).toBe(10)
	})

	it('[P7][regression 1] should allow computeds to be updated properly', () => {
		const a = atom('', 0)
		const b = atom('', 0)
		const c = computed('', () => b.get() * 2)

		let cValue = 0

		react('', () => {
			b.set(a.get() + 1)
			cValue = c.get()
		})

		expect(a.get()).toBe(0)
		expect(b.get()).toBe(1)
		expect(cValue).toBe(2)

		transact(() => {
			a.set(1)
		})
		expect(cValue).toBe(4)
	})

	it('[P7][regression 2] should allow computeds to be updated properly', () => {
		const a = atom('', 0)
		const b = atom('', 1)
		const c = atom('', 0)
		const d = computed('', () => a.get() * 2)

		let dValue = 0
		react('', () => {
			// update a, causes a and d to be traversed (but not updated)
			a.set(b.get())
			// update c
			c.set(a.get())
			// make sure that when we get d, it is updated properly
			dValue = d.get()
		})

		expect(a.get()).toBe(1)
		expect(b.get()).toBe(1)
		expect(c.get()).toBe(1)

		expect(dValue).toBe(2)

		transact(() => {
			b.set(2)
		})
		expect(dValue).toBe(4)
	})
})

describe('transactions during the reaction phase (P6)', () => {
	it('[P6] it should be possible to run a transaction during a reaction', () => {
		const a = atom('', 0)
		const b = atom('', 0)

		react('', () => {
			transaction(() => {
				b.set(a.get() + 1)
			})
		})

		expect(a.get()).toBe(0)
		expect(b.get()).toBe(1)

		a.set(1)

		expect(b.get()).toBe(2)

		transaction(() => {
			a.set(2)
			expect(b.get()).toBe(2)
		})

		expect(b.get()).toBe(3)
	})

	it('[P6] it should be possible to abort a transaction during a reaction', () => {
		const a = atom('', 0)
		const b = atom('', 0)

		const unsub = react('', () => {
			transaction((rollback) => {
				b.set(a.get() + 1)
				rollback()
			})
			expect(b.get()).toBe(0)
		})

		expect(a.get()).toBe(0)
		expect(b.get()).toBe(0)

		unsub()

		react('', () => {
			transaction(() => {
				b.set(3)
				try {
					transaction(() => {
						b.set(a.get() + 1)
						throw new Error('oops')
					})
				} catch (e: any) {
					expect(e.message).toBe('oops')
				} finally {
					expect(b.get()).toBe(3)
				}
			})
			expect(b.get()).toBe(3)
		})

		expect(a.get()).toBe(0)
		expect(b.get()).toBe(3)

		expect.assertions(8)
	})

	it('[P6] defers all side effects until the end of the outer reaction pass', () => {
		const a = atom('', 0)
		const b = atom('', 0)
		const c = atom('', 0)

		const aChanged = vi.fn()
		const bChanged = vi.fn()
		const cChanged = vi.fn()

		react('', () => {
			a.get()
			aChanged()
		})

		react('', () => {
			transaction(() => {
				a.set(b.get() + 1)
			})
			bChanged()
		})

		react('', () => {
			transaction(() => {
				b.set(c.get() + 1)
			})
			cChanged()
		})

		expect(aChanged).toHaveBeenCalledTimes(3)
		expect(bChanged).toHaveBeenCalledTimes(2)
		expect(cChanged).toHaveBeenCalledTimes(1)

		expect(a.__unsafe__getWithoutCapture()).toBe(2)

		cChanged.mockImplementationOnce(() => {
			// b was .set() during c's reaction
			expect(b.__unsafe__getWithoutCapture()).toBe(2)
			// a was not yet set because the effect was deferred
			// until the end of the reaction
			expect(a.__unsafe__getWithoutCapture()).toBe(2)
		})

		c.set(1)

		expect(a.__unsafe__getWithoutCapture()).toBe(3)
		expect(cChanged).toHaveBeenCalledTimes(2)
	})
})
