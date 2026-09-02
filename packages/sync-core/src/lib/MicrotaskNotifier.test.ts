import { vi } from 'vitest'
import { MicrotaskNotifier } from './MicrotaskNotifier'

// Helper to flush all pending microtasks
async function flushMicrotasks() {
	await Promise.resolve()
}

describe('MicrotaskNotifier', () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		consoleErrorSpy.mockRestore()
	})

	describe('deferred delivery (MN1)', () => {
		it('[MN1] does not call listeners synchronously', () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			notifier.register(listener)
			notifier.notify('hello')

			expect(listener).not.toHaveBeenCalled()
		})

		it('[MN1] delivers the notification arguments to every listener on a microtask', async () => {
			const notifier = new MicrotaskNotifier<[string, number, boolean]>()
			const listener1 = vi.fn()
			const listener2 = vi.fn()

			notifier.register(listener1)
			notifier.register(listener2)
			await flushMicrotasks()

			notifier.notify('test', 123, true)
			await flushMicrotasks()

			expect(listener1).toHaveBeenCalledExactlyOnceWith('test', 123, true)
			expect(listener2).toHaveBeenCalledExactlyOnceWith('test', 123, true)
		})

		it('[MN1] delivers multiple notifications in order', async () => {
			const notifier = new MicrotaskNotifier<[number]>()
			const calls: number[] = []
			const listener = vi.fn((n: number) => calls.push(n))

			notifier.register(listener)
			await flushMicrotasks()

			notifier.notify(1)
			notifier.notify(2)
			notifier.notify(3)
			await flushMicrotasks()

			expect(calls).toEqual([1, 2, 3])
		})

		it('[MN1] notify with no listeners does not throw', async () => {
			const notifier = new MicrotaskNotifier<[string]>()

			expect(() => notifier.notify('test')).not.toThrow()
			await flushMicrotasks()
		})
	})

	describe('deferred registration (MN2)', () => {
		it('[MN2] a listener misses notifications issued before register was called', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			notifier.notify('before registration')
			notifier.register(listener)
			await flushMicrotasks()

			expect(listener).not.toHaveBeenCalled()
		})

		it('[MN2] a listener receives notifications issued after register in the same synchronous block', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			// Both register and notify queue microtasks; microtasks run FIFO, so
			// the add runs first and the notification is delivered
			notifier.register(listener)
			notifier.notify('same sync block')

			await flushMicrotasks()

			expect(listener).toHaveBeenCalledExactlyOnceWith('same sync block')
		})

		it('[MN2] registering during a notification defers the new listener to later notifications', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const lateListener = vi.fn()
			const listener1 = vi.fn(() => {
				notifier.register(lateListener)
			})

			notifier.register(listener1)
			await flushMicrotasks()

			notifier.notify('first')
			await flushMicrotasks()

			expect(lateListener).not.toHaveBeenCalled()

			await flushMicrotasks() // late registration completes

			notifier.notify('second')
			await flushMicrotasks()

			expect(lateListener).toHaveBeenCalledExactlyOnceWith('second')
		})
	})

	describe('unsubscribing (MN3)', () => {
		it('[MN3] unsubscribe is synchronous and stops future notifications', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()
			const other = vi.fn()

			const unsubscribe = notifier.register(listener)
			notifier.register(other)
			await flushMicrotasks()

			unsubscribe()
			notifier.notify('should not receive')
			await flushMicrotasks()

			expect(listener).not.toHaveBeenCalled()
			// other listeners are unaffected
			expect(other).toHaveBeenCalledExactlyOnceWith('should not receive')
		})

		it('[MN3] unsubscribing before the add microtask runs prevents the registration entirely', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			const unsubscribe = notifier.register(listener)
			unsubscribe() // before the add microtask runs

			await flushMicrotasks()

			notifier.notify('should not receive')
			await flushMicrotasks()

			expect(listener).not.toHaveBeenCalled()
		})

		it('[MN3] double unsubscribe is safe', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			const unsubscribe = notifier.register(listener)
			await flushMicrotasks()

			unsubscribe()
			unsubscribe()
			unsubscribe()

			notifier.notify('test')
			await flushMicrotasks()

			expect(listener).not.toHaveBeenCalled()
		})

		it('[MN3] registering the same function twice', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			const unsub1 = notifier.register(listener)
			const _unsub2 = notifier.register(listener)
			await flushMicrotasks()

			notifier.notify('test')
			await flushMicrotasks()

			// The listener set deduplicates the same function reference, so it is
			// only called once per notification
			expect(listener).toHaveBeenCalledTimes(1)

			// Unsubscribing via the first registration removes the function for
			// both registrations
			unsub1()
			notifier.notify('test2')
			await flushMicrotasks()

			expect(listener).toHaveBeenCalledTimes(1)
		})

		it('[MN3] unsubscribing during notification iteration takes effect for later notifications', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			let unsub2: (() => void) | undefined = undefined

			const listener1 = vi.fn(() => {
				// Unsubscribe listener2 while iteration is in progress
				unsub2?.()
			})
			const listener2 = vi.fn()
			const listener3 = vi.fn()

			notifier.register(listener1)
			unsub2 = notifier.register(listener2)
			notifier.register(listener3)
			await flushMicrotasks()

			notifier.notify('test')
			await flushMicrotasks()

			expect(listener1).toHaveBeenCalled()
			expect(listener3).toHaveBeenCalled()

			listener1.mockClear()
			listener2.mockClear()
			listener3.mockClear()

			notifier.notify('test2')
			await flushMicrotasks()

			expect(listener1).toHaveBeenCalled()
			expect(listener2).not.toHaveBeenCalled()
			expect(listener3).toHaveBeenCalled()
		})
	})

	describe('listener errors (MN4)', () => {
		it('[MN4] a listener that throws is caught and logged, and remaining listeners still run', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const errorListener = vi.fn(() => {
				throw new Error('listener error')
			})
			const normalListener = vi.fn()

			notifier.register(errorListener)
			notifier.register(normalListener)
			await flushMicrotasks()

			notifier.notify('test')
			await flushMicrotasks()

			expect(errorListener).toHaveBeenCalled()
			expect(normalListener).toHaveBeenCalled()
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Error in MicrotaskNotifier listener',
				expect.any(Error)
			)
		})
	})
})
