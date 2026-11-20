import { atom } from '../Atom'
import { computed } from '../Computed'
import { react } from '../EffectScheduler'
import {
	beforeTransactionCommit,
	getGlobalEpoch,
	onTransactionAbort,
	transact,
	transaction,
} from '../transactions'

// Tests for SPEC.md §11 (transactions), plus rule EP6.
// Rule IDs like [T4] in test names refer to that document.

describe('transactions (T)', () => {
	it('[T2][T3][T4][T6] batch changes, defer effects, and can be rolled back', () => {
		const firstName = atom('', 'John')
		const lastName = atom('', 'Doe')

		let numTimesComputed = 0
		const fullName = computed('', () => {
			numTimesComputed++
			return `${firstName.get()} ${lastName.get()}`
		})

		let numTimesReacted = 0
		let name = ''

		react('', () => {
			name = fullName.get()
			numTimesReacted++
		})

		expect(numTimesReacted).toBe(1)
		expect(numTimesComputed).toBe(1)
		expect(name).toBe('John Doe')

		transaction((rollback) => {
			firstName.set('Wilbur')
			expect(numTimesComputed).toBe(1)
			expect(numTimesReacted).toBe(1)
			// [T6] effects never observe intermediate in-transaction values
			expect(name).toBe('John Doe')
			lastName.set('Jones')
			expect(numTimesComputed).toBe(1)
			expect(numTimesReacted).toBe(1)
			expect(name).toBe('John Doe')
			// [T2] reads inside the transaction see the latest values
			expect(fullName.get()).toBe('Wilbur Jones')

			expect(numTimesComputed).toBe(2)
			expect(numTimesReacted).toBe(1)
			expect(name).toBe('John Doe')

			rollback()
		})

		// [T6] the aborted transaction still flushes effects, which observe the restored values
		expect(numTimesComputed).toBe(3)
		expect(numTimesReacted).toBe(2)

		expect(fullName.get()).toBe('John Doe')
		expect(name).toBe('John Doe')
	})

	it('[T1] returns the value of the function, even when rolled back', () => {
		expect(transaction(() => 'hello')).toBe('hello')
		expect(transact(() => 42)).toBe(42)
		expect(
			transaction((rollback) => {
				rollback()
				return 'rolled back'
			})
		).toBe('rolled back')
	})

	it('[EP6] advances the global epoch when aborted', () => {
		const startEpoch = getGlobalEpoch()
		transaction((rollback) => {
			rollback()
		})
		expect(getGlobalEpoch()).toBeGreaterThan(startEpoch)
	})

	it('[T7] nested transactions roll back independently', () => {
		const atomA = atom('', 0)
		const atomB = atom('', 0)

		transaction((rollback) => {
			atomA.set(1)
			atomB.set(-1)
			transaction((rollback) => {
				atomA.set(2)
				atomB.set(-2)
				transaction((rollback) => {
					atomA.set(3)
					atomB.set(-3)
					rollback()
				})
				rollback()
			})
			rollback()
		})

		expect(atomA.get()).toBe(0)
		expect(atomB.get()).toBe(0)

		transaction((rollback) => {
			atomA.set(1)
			atomB.set(-1)
			transaction((rollback) => {
				atomA.set(2)
				atomB.set(-2)
				transaction(() => {
					atomA.set(3)
					atomB.set(-3)
				})
				rollback()
			})
			rollback()
		})

		expect(atomA.get()).toBe(0)
		expect(atomB.get()).toBe(0)

		transaction((rollback) => {
			atomA.set(1)
			atomB.set(-1)
			transaction(() => {
				atomA.set(2)
				atomB.set(-2)
				transaction(() => {
					atomA.set(3)
					atomB.set(-3)
				})
			})
			rollback()
		})

		expect(atomA.get()).toBe(0)
		expect(atomB.get()).toBe(0)

		transaction(() => {
			atomA.set(1)
			atomB.set(-1)
			transaction((rollback) => {
				atomA.set(2)
				atomB.set(-2)
				transaction((rollback) => {
					atomA.set(3)
					atomB.set(-3)
					rollback()
				})
				rollback()
			})
		})

		expect(atomA.get()).toBe(1)
		expect(atomB.get()).toBe(-1)

		transaction(() => {
			atomA.set(1)
			atomB.set(-1)
			transaction(() => {
				atomA.set(2)
				atomB.set(-2)
				transaction((rollback) => {
					atomA.set(3)
					atomB.set(-3)
					rollback()
				})
			})
		})

		expect(atomA.get()).toBe(2)
		expect(atomB.get()).toBe(-2)
	})

	it('[T7] an outer rollback undoes a committed inner transaction', () => {
		const a = atom('', 'a')

		transaction((rollback) => {
			transaction(() => {
				a.set('b')
			})
			rollback()
		})

		expect(a.get()).toBe('a')
	})

	it('[T7] an outer rollback undoes an inner transaction committed during the reaction phase', () => {
		// Regression: committing a nested transaction inside an effect used to skip folding its
		// initial values into the parent, so the outer rollback could not restore them.
		const trigger = atom('', 0)
		const a = atom('', 'a')
		const b = atom('', 'b')

		react('', () => {
			if (trigger.get() === 0) return
			transaction((rollback) => {
				b.set('B')
				transaction(() => {
					a.set('A')
				})
				rollback()
			})
		})
		trigger.set(1)

		expect(a.get()).toBe('a')
		expect(b.get()).toBe('b')
	})

	it('[T4] rollback restores computed signals too', () => {
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
})

describe('transact (T)', () => {
	it('[T5] aborts and rethrows if the function throws', () => {
		const a = atom('', 'a')

		try {
			transact(() => {
				a.set('b')
				throw new Error('blah')
			})
		} catch (e: any) {
			expect(e.message).toBe('blah')
		}

		expect(a.get()).toBe('a')

		expect.assertions(2)
	})

	it('[T1][T8] joins the current transaction instead of nesting, so an inner throw restores nothing', () => {
		const a = atom('', 'a')

		transact(() => {
			a.set('b')

			try {
				transact(() => {
					a.set('c')
					throw new Error('blah')
				})
			} catch (e: any) {
				expect(e.message).toBe('blah')
			}
			expect(a.get()).toBe('c')
		})

		expect(a.get()).toBe('c')

		expect.assertions(3)
	})
})

describe('beforeTransactionCommit (T12)', () => {
	it('runs once when the outermost transaction is about to commit, before effects', () => {
		const a = atom('', 0)
		const seenByEffect: number[] = []
		react('', () => void seenByEffect.push(a.get()))
		const log: string[] = []

		transaction(() => {
			transaction(() => {
				a.set(1)
				beforeTransactionCommit(() => log.push(`commit ${a.get()}, effect saw ${seenByEffect}`))
			})
			log.push('inner committed')
			a.set(2)
		})

		expect(log).toEqual(['inner committed', 'commit 2, effect saw 0'])
		expect(seenByEffect).toEqual([0, 2])
	})

	it('does not run callbacks from a transaction that aborts', () => {
		const ran = vi.fn()
		transaction(() => {
			transaction((rollback) => {
				beforeTransactionCommit(ran)
				rollback()
			})
		})
		expect(() =>
			transaction(() => {
				beforeTransactionCommit(ran)
				throw new Error('boom')
			})
		).toThrow('boom')
		expect(ran).not.toHaveBeenCalled()
	})

	it('runs callbacks registered by a callback, and commits what callbacks change', () => {
		const a = atom('', 0)
		transaction(() => {
			beforeTransactionCommit(() => {
				a.set(1)
				beforeTransactionCommit(() => a.set(a.get() + 1))
			})
		})
		expect(a.get()).toBe(2)
	})

	it.each([
		['rollback', (rollback: () => void) => rollback(), undefined],
		[
			'a throw',
			() => {
				throw new Error('boom')
			},
			'boom',
		],
	])('aborts the whole transaction on %s', (_name, refuse, error) => {
		const a = atom('', 0)
		const aborted = vi.fn()
		const later = vi.fn()
		const run = () =>
			transaction(() => {
				a.set(1)
				onTransactionAbort(aborted)
				beforeTransactionCommit(refuse)
				beforeTransactionCommit(later)
				return 'result'
			})

		if (error) expect(run).toThrow(error)
		else expect(run()).toBe('result')

		expect(a.get()).toBe(0)
		expect(aborted).toHaveBeenCalledTimes(1)
		expect(later).not.toHaveBeenCalled()
	})

	it("aborts when a callback calls the transaction's own rollback", () => {
		const a = atom('', 0)
		const later = vi.fn()
		transaction((rollback) => {
			a.set(1)
			beforeTransactionCommit(() => rollback())
			beforeTransactionCommit(later)
		})
		expect(a.get()).toBe(0)
		expect(later).toHaveBeenCalledTimes(1)
	})
})
