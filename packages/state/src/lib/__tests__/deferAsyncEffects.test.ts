import { promiseWithResolve, sleep } from '@tldraw/utils'
import { vi } from 'vitest'
import { atom } from '../Atom'
import { computed } from '../Computed'
import { react } from '../EffectScheduler'
import { deferAsyncEffects, transact, transaction } from '../transactions'

// Tests for SPEC.md §12 (async transactions: deferAsyncEffects).
// Rule IDs like [AT3] in test names refer to that document.

describe('deferAsyncEffects (AT)', () => {
	it('[AT1] defers effects until the async transaction commits', async () => {
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

	it('[AT1] keeps computed signals up to date during the async transaction', async () => {
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

	it('[AT2] throws if kicked off during a sync transaction', async () => {
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

	it('[AT2] allows sync transactions inside the async body', async () => {
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

	it('[AT2] allows transact inside the async body', async () => {
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

	it('[AT3] rolls back all changes on exception', async () => {
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

	it('[AT3][AT4] rolls back everything when a nested async transaction throws', async () => {
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

	it('[AT4] nested async transactions join the outer one', async () => {
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

	it('[AT4] concurrent async transactions are merged', async () => {
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

	it('[AT4] overlapping transactions leak state to each other but group their effects', async () => {
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

	it('[AT5] waits for the reaction phase to finish if kicked off during a reaction', async () => {
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

	it('[AT6] resolves to the return value of the function', async () => {
		await expect(deferAsyncEffects(async () => 'value')).resolves.toBe('value')
	})
})
