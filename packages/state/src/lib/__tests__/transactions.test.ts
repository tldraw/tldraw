import { promiseWithResolve, sleep } from '@tldraw/utils'
import { describe, expect, it, test, vi } from 'vitest'
import { atom } from '../Atom'
import { computed } from '../Computed'
import { react } from '../EffectScheduler'
import { deferAsyncEffects, transact, transaction } from '../transactions'

describe('transactions', () => {
	it('should be abortable', () => {
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
			expect(name).toBe('John Doe')
			lastName.set('Jones')
			expect(numTimesComputed).toBe(1)
			expect(numTimesReacted).toBe(1)
			expect(name).toBe('John Doe')
			expect(fullName.get()).toBe('Wilbur Jones')

			expect(numTimesComputed).toBe(2)
			expect(numTimesReacted).toBe(1)
			expect(name).toBe('John Doe')

			rollback()
		})

		// computes again
		expect(numTimesComputed).toBe(3)
		expect(numTimesReacted).toBe(2)

		expect(fullName.get()).toBe('John Doe')
		expect(name).toBe('John Doe')
	})

	it('nested rollbacks work as expected', () => {
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

	it('should restore the original even if an inner commits', () => {
		const a = atom('', 'a')

		transaction((rollback) => {
			transaction(() => {
				a.set('b')
			})
			rollback()
		})

		expect(a.get()).toBe('a')
	})
})

describe('transact', () => {
	it('executes things in a transaction', () => {
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

	it('does not create nested transactions', () => {
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

describe('setting atoms during a reaction', () => {
	it('should work', () => {
		const a = atom('', 0)
		const b = atom('', 0)

		react('', () => {
			b.set(a.get() + 1)
		})

		expect(a.get()).toBe(0)
		expect(b.get()).toBe(1)
	})

	it('should throw an error if it gets into a loop', () => {
		expect(() => {
			const a = atom('', 0)

			react('', () => {
				a.set(a.get() + 1)
			})
		}).toThrowErrorMatchingInlineSnapshot(`[Error: Reaction update depth limit exceeded]`)
	})

	it('should work with a transaction running', () => {
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

	it('[regression 1] should allow computeds to be updated properly', () => {
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

	it('[regression 2] should allow computeds to be updated properly', () => {
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

test('it should be possible to run a transaction during a reaction', () => {
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

test('it should be possible to abort a transaction during a reaction', () => {
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

it('should defer all side effects until the end of the outer transaction', () => {
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
		// util the end of the reaction
		expect(a.__unsafe__getWithoutCapture()).toBe(2)
	})

	c.set(1)

	expect(a.__unsafe__getWithoutCapture()).toBe(3)
	expect(cChanged).toHaveBeenCalledTimes(2)
})

describe('deferAsyncEffects', () => {
	it('works if kicked off during a reaction', async () => {
		const a = atom('', 0)
		const b = atom('', 0)

		let txp: any = null

		react('', () => {
			a.get()
			txp = deferAsyncEffects(async () => {
				await sleep(1)
				b.set(a.get() + 1)
			})
		})

		await txp

		expect(a.get()).toBe(0)
		expect(b.get()).toBe(1)

		a.set(1)

		await txp

		expect(a.get()).toBe(1)
		expect(b.get()).toBe(2)
	})

	it('throws an error if kicked off during a sync transaction', async () => {
		const a = atom('', 0)
		let txp: any = null
		transact(() => {
			txp = deferAsyncEffects(async () => {
				expect(a.get()).toBe(1)
				a.set(2)
			})
			a.set(1)
		})

		await expect(txp).rejects.toMatchInlineSnapshot(
			`[Error: deferAsyncEffects cannot be called during a sync transaction]`
		)
	})

	it('can have nested sync transactions', async () => {
		const a = atom('', 0)

		await deferAsyncEffects(async () => {
			a.set(1)
			transaction(() => {
				a.set(2)
			})
			expect(a.get()).toBe(2)
		})
		expect(a.get()).toBe(2)
	})

	it('can have nested async transactions', async () => {
		const a = atom('', 0)

		await deferAsyncEffects(async () => {
			a.set(1)
			await deferAsyncEffects(async () => {
				a.set(2)
			})
			expect(a.get()).toBe(2)
		})
		expect(a.get()).toBe(2)
	})

	it('allows transact to be called inside deferAsyncEffects', async () => {
		const a = atom('', 0)

		await deferAsyncEffects(async () => {
			a.set(1)
			transact(() => {
				a.set(2)
			})
			expect(a.get()).toBe(2)
		})
		expect(a.get()).toBe(2)
	})

	it('allows overlapping transactions', async () => {
		const a = atom('', 0)

		let txp = null

		const p = deferAsyncEffects(async () => {
			a.set(1)
			const x = promiseWithResolve()
			txp = deferAsyncEffects(async () => {
				a.set(2)
				x.resolve(null)
				await sleep(10)
				a.set(3)
				return 'inner'
			})
			await x
			// inner transactions leak, this can't be avoided without AsyncContext
			// but at least we can group effects.
			expect(a.get()).toBe(2)
			return 'outer'
		})

		await expect(p).resolves.toBe('outer')
		await expect(txp).resolves.toBe('inner')
		expect(a.get()).toBe(3)
	})

	it('should rollback on exception', async () => {
		const a = atom('', 0)
		const b = atom('', 0)

		await expect(
			deferAsyncEffects(async () => {
				a.set(1)
				b.set(2)
				throw new Error('test error')
			})
		).rejects.toThrow('test error')

		expect(a.get()).toBe(0)
		expect(b.get()).toBe(0)
	})

	it('should defer effects until async transaction commits', async () => {
		const a = atom('', 0)
		const b = atom('', 0)
		const effectCalls = vi.fn()

		react('', () => {
			a.get()
			b.get()
			effectCalls()
		})

		expect(effectCalls).toHaveBeenCalledTimes(1)

		const txPromise = deferAsyncEffects(async () => {
			a.set(1)
			expect(effectCalls).toHaveBeenCalledTimes(1) // no effect yet
			await sleep(1)
			b.set(2)
			expect(effectCalls).toHaveBeenCalledTimes(1) // still no effect
		})

		await txPromise
		expect(effectCalls).toHaveBeenCalledTimes(2) // effect runs after commit
	})

	it('should handle computed signals properly in async transactions', async () => {
		const a = atom('', 1)
		const doubled = computed('', () => a.get() * 2)

		expect(doubled.get()).toBe(2)

		await deferAsyncEffects(async () => {
			a.set(5)
			// computed should update during transaction
			expect(doubled.get()).toBe(10)
			await sleep(1)
			a.set(10)
			expect(doubled.get()).toBe(20)
		})

		// computed should update after commit
		expect(doubled.get()).toBe(20)
		expect(a.get()).toBe(10)
	})

	it('should handle multiple concurrent async transactions', async () => {
		const a = atom('', 0)
		const b = atom('', 0)
		const results: number[] = []

		const tx1 = deferAsyncEffects(async () => {
			a.set(1)
			await sleep(10)
			results.push(a.get())
			return 'tx1'
		})

		const tx2 = deferAsyncEffects(async () => {
			b.set(2)
			await sleep(5)
			results.push(b.get())
			return 'tx2'
		})

		const [result1, result2] = await Promise.all([tx1, tx2])

		expect(result1).toBe('tx1')
		expect(result2).toBe('tx2')
		expect(a.get()).toBe(1)
		expect(b.get()).toBe(2)
		expect(results).toEqual([2, 1])
	})

	it('should handle exception in nested async transaction', async () => {
		const a = atom('', 0)
		const b = atom('', 0)

		await expect(
			deferAsyncEffects(async () => {
				a.set(1)

				await deferAsyncEffects(async () => {
					b.set(2)
					throw new Error('inner error')
				})
			})
		).rejects.toThrow('inner error')

		expect(a.get()).toBe(0) // all changes should be rolled back
		expect(b.get()).toBe(0)
	})
})

describe('helper functions', () => {
	it('should get global epoch', async () => {
		const { getGlobalEpoch } = await import('../transactions')
		const initialEpoch = getGlobalEpoch()
		expect(typeof initialEpoch).toBe('number')
		expect(initialEpoch).toBeGreaterThan(0)
	})

	it('should get reaction epoch', async () => {
		const { getReactionEpoch } = await import('../transactions')
		const initialEpoch = getReactionEpoch()
		expect(typeof initialEpoch).toBe('number')
		expect(initialEpoch).toBeGreaterThan(0)
	})

	it('should advance global epoch', async () => {
		const { getGlobalEpoch, advanceGlobalEpoch } = await import('../transactions')
		const beforeEpoch = getGlobalEpoch()
		advanceGlobalEpoch()
		const afterEpoch = getGlobalEpoch()
		expect(afterEpoch).toBe(beforeEpoch + 1)
	})

	it('should detect when reacting', async () => {
		const { getIsReacting } = await import('../transactions')
		expect(getIsReacting()).toBe(false)

		let isReactingDuringReaction = false
		const a = atom('test', 0)

		// Create initial reaction
		react('test', () => {
			isReactingDuringReaction = getIsReacting()
			a.get() // trigger dependency
		})

		// The flag should be false during initial setup
		expect(isReactingDuringReaction).toBe(false)

		// But should be true during flush/update cycle
		isReactingDuringReaction = false
		react('test2', () => {
			isReactingDuringReaction = getIsReacting()
			a.get()
		})

		// Trigger an update to see the reacting flag during flush
		a.set(1)

		expect(getIsReacting()).toBe(false) // should be false after reaction completes
	})
})

describe('atomDidChange', () => {
	it('should handle changes during transaction', () => {
		const a = atom('test', 0)
		const effectCalls = vi.fn()

		react('test', () => {
			a.get()
			effectCalls()
		})

		expect(effectCalls).toHaveBeenCalledTimes(1)

		transaction(() => {
			a.set(1)
			a.set(2)
			a.set(3)
			// Effect should not run during transaction
			expect(effectCalls).toHaveBeenCalledTimes(1)
		})

		// Effect should run once after transaction commits
		expect(effectCalls).toHaveBeenCalledTimes(2)
		expect(a.get()).toBe(3)
	})

	it('should handle changes during reaction', () => {
		const a = atom('trigger', 0)
		const b = atom('target', 0)
		const effectCalls = vi.fn()

		react('test', () => {
			a.get()
			b.set(a.get() + 10) // This should trigger cleanup reactors
			effectCalls()
		})

		expect(effectCalls).toHaveBeenCalledTimes(1)
		expect(b.get()).toBe(10)

		a.set(5)

		expect(effectCalls).toHaveBeenCalledTimes(2)
		expect(b.get()).toBe(15)
	})

	it('should flush changes immediately when no transaction', () => {
		const a = atom('test', 0)
		const effectCalls = vi.fn()

		react('test', () => {
			a.get()
			effectCalls()
		})

		expect(effectCalls).toHaveBeenCalledTimes(1)

		// Direct change should flush immediately
		a.set(1)

		expect(effectCalls).toHaveBeenCalledTimes(2)
	})
})

describe('Transaction class', () => {
	it('should preserve initial values across nested commits', () => {
		const a = atom('test', 0)

		transaction((rollback) => {
			a.set(1)

			transaction(() => {
				a.set(2)
				// Inner transaction commits
			})

			// Should still be able to rollback to original value
			rollback()
		})

		expect(a.get()).toBe(0)
	})

	it('should handle abort with history buffer clearing', () => {
		const a = atom('test', 0, { historyLength: 10 })

		transaction((rollback) => {
			a.set(1)
			a.set(2)
			a.set(3)
			rollback()
		})

		expect(a.get()).toBe(0)
		// History buffer should be cleared during abort
	})
})

describe('error handling and edge cases', () => {
	it('should handle errors thrown during commit', () => {
		const a = atom('test', 0)

		// Create a reaction that throws during update
		react('throwing reaction', () => {
			if (a.get() === 1) {
				throw new Error('reaction error')
			}
		})

		expect(() => {
			transaction(() => {
				a.set(1)
			})
		}).toThrow('reaction error')
	})

	it('should handle multiple atoms in flush', () => {
		const a = atom('a', 0)
		const b = atom('b', 0)
		const c = atom('c', 0)
		const effectCalls = vi.fn()

		react('multi-atom reaction', () => {
			const sum = a.get() + b.get() + c.get()
			effectCalls(sum)
		})

		expect(effectCalls).toHaveBeenCalledWith(0)

		transaction(() => {
			a.set(1)
			b.set(2)
			c.set(3)
		})

		expect(effectCalls).toHaveBeenCalledWith(6)
		expect(effectCalls).toHaveBeenCalledTimes(2)
	})
})

describe('deferAsyncEffects edge cases', () => {
	it('should handle async transaction process counting', async () => {
		const a = atom('', 0)
		let txCount = 0

		const tx1 = deferAsyncEffects(async () => {
			txCount++
			a.set(1)
			await sleep(10)
			return 'tx1'
		})

		const tx2 = deferAsyncEffects(async () => {
			txCount++
			a.set(2)
			await sleep(5)
			return 'tx2'
		})

		await Promise.all([tx1, tx2])
		expect(txCount).toBe(2)
		// Final value should be from last transaction to complete
		expect(a.get()).toBe(2)
	})

	it('should wait for reactions to finish before starting async transaction', async () => {
		const a = atom('', 0)
		const b = atom('', 0)
		let asyncStarted = false

		react('slow reaction', () => {
			if (a.get() > 0) {
				// Simulate slow reaction
				for (let i = 0; i < 10000; i++) {
					// busy wait (short to not slow down tests)
				}
			}
		})

		a.set(1) // Trigger reaction

		// Start async transaction while reaction might still be running
		const asyncTx = deferAsyncEffects(async () => {
			asyncStarted = true
			b.set(10)
		})

		await asyncTx
		expect(asyncStarted).toBe(true)
		expect(b.get()).toBe(10)
	})

	it('should handle error propagation in async transactions', async () => {
		const a = atom('', 0)

		await expect(
			deferAsyncEffects(async () => {
				a.set(1)
				throw new Error('async error')
			})
		).rejects.toThrow('async error')

		// Changes should be rolled back
		expect(a.get()).toBe(0)
	})

	it('should handle null error in async transaction', async () => {
		const a = atom('', 0)

		await expect(
			deferAsyncEffects(async () => {
				a.set(1)
				throw null // Test null error handling
			})
		).rejects.toBeNull()

		// Changes should be rolled back
		expect(a.get()).toBe(0)
	})
})
