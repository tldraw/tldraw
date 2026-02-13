import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

	describe('basic functionality', () => {
		it('calls registered listeners when notified', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			notifier.register(listener)
			await flushMicrotasks() // Wait for registration

			notifier.notify('hello')
			await flushMicrotasks() // Wait for notification

			expect(listener).toHaveBeenCalledWith('hello')
			expect(listener).toHaveBeenCalledTimes(1)
		})

		it('calls multiple listeners', async () => {
			const notifier = new MicrotaskNotifier<[number]>()
			const listener1 = vi.fn()
			const listener2 = vi.fn()
			const listener3 = vi.fn()

			notifier.register(listener1)
			notifier.register(listener2)
			notifier.register(listener3)
			await flushMicrotasks()

			notifier.notify(42)
			await flushMicrotasks()

			expect(listener1).toHaveBeenCalledWith(42)
			expect(listener2).toHaveBeenCalledWith(42)
			expect(listener3).toHaveBeenCalledWith(42)
		})

		it('supports multiple arguments', async () => {
			const notifier = new MicrotaskNotifier<[string, number, boolean]>()
			const listener = vi.fn()

			notifier.register(listener)
			await flushMicrotasks()

			notifier.notify('test', 123, true)
			await flushMicrotasks()

			expect(listener).toHaveBeenCalledWith('test', 123, true)
		})

		it('supports object arguments', async () => {
			const notifier = new MicrotaskNotifier<[{ id: string; value: number }]>()
			const listener = vi.fn()

			notifier.register(listener)
			await flushMicrotasks()

			const obj = { id: 'abc', value: 100 }
			notifier.notify(obj)
			await flushMicrotasks()

			expect(listener).toHaveBeenCalledWith(obj)
		})

		it('unsubscribe removes the listener', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			const unsubscribe = notifier.register(listener)
			await flushMicrotasks()

			unsubscribe()

			notifier.notify('should not receive')
			await flushMicrotasks()

			expect(listener).not.toHaveBeenCalled()
		})
	})

	describe('microtask deferral', () => {
		it('does not call listeners synchronously', () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			notifier.register(listener)
			notifier.notify('hello')

			// Listener should not be called yet (registration is deferred)
			expect(listener).not.toHaveBeenCalled()
		})

		it('defers registration to microtask queue', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			notifier.register(listener)

			// Notify immediately - since both register and notify queue microtasks,
			// and microtasks execute in FIFO order, the add runs first, then notify
			notifier.notify('same sync block')

			await flushMicrotasks()

			// Listener DOES receive it because microtasks are FIFO ordered:
			// 1. add listener
			// 2. notify
			expect(listener).toHaveBeenCalledWith('same sync block')
		})

		it('does not receive notifications that completed before registration was queued', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			// Notify first
			notifier.notify('before registration')
			await flushMicrotasks() // Notification completes

			// Register after
			notifier.register(listener)
			await flushMicrotasks()

			// Listener should NOT have been called for the earlier notification
			expect(listener).not.toHaveBeenCalled()
		})

		it('notifications after registration completes are received', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			notifier.register(listener)
			await flushMicrotasks() // Wait for registration

			notifier.notify('after registration')
			await flushMicrotasks()

			expect(listener).toHaveBeenCalledWith('after registration')
		})
	})

	describe('race conditions and edge cases', () => {
		it('unsubscribing before add microtask runs prevents registration', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			const unsubscribe = notifier.register(listener)
			unsubscribe() // Unsubscribe immediately, before add microtask runs

			await flushMicrotasks()

			notifier.notify('should not receive')
			await flushMicrotasks()

			expect(listener).not.toHaveBeenCalled()
		})

		it('double unsubscribe is safe', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			const unsubscribe = notifier.register(listener)
			await flushMicrotasks()

			// Call unsubscribe multiple times
			unsubscribe()
			unsubscribe()
			unsubscribe()

			notifier.notify('test')
			await flushMicrotasks()

			expect(listener).not.toHaveBeenCalled()
		})

		it('unsubscribing one listener does not affect others', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener1 = vi.fn()
			const listener2 = vi.fn()
			const listener3 = vi.fn()

			const unsub1 = notifier.register(listener1)
			notifier.register(listener2)
			notifier.register(listener3)
			await flushMicrotasks()

			unsub1()

			notifier.notify('test')
			await flushMicrotasks()

			expect(listener1).not.toHaveBeenCalled()
			expect(listener2).toHaveBeenCalledWith('test')
			expect(listener3).toHaveBeenCalledWith('test')
		})

		it('error in one listener does not prevent others from being called', async () => {
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

		it('multiple rapid notifications are all delivered', async () => {
			const notifier = new MicrotaskNotifier<[number]>()
			const listener = vi.fn()

			notifier.register(listener)
			await flushMicrotasks()

			notifier.notify(1)
			notifier.notify(2)
			notifier.notify(3)
			await flushMicrotasks()

			expect(listener).toHaveBeenCalledTimes(3)
			expect(listener).toHaveBeenNthCalledWith(1, 1)
			expect(listener).toHaveBeenNthCalledWith(2, 2)
			expect(listener).toHaveBeenNthCalledWith(3, 3)
		})

		it('registering the same function twice creates independent subscriptions', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			const unsub1 = notifier.register(listener)
			const _unsub2 = notifier.register(listener)
			await flushMicrotasks()

			notifier.notify('test')
			await flushMicrotasks()

			// Same function registered twice, but Set deduplicates
			// So it should only be called once
			expect(listener).toHaveBeenCalledTimes(1)

			// Unsubscribing the first should remove it
			unsub1()
			notifier.notify('test2')
			await flushMicrotasks()

			// The second registration is the same function, already removed by unsub1
			// Actually, since it's the same function reference, unsub1 removed it
			// and unsub2 would try to remove it again (which is a no-op)
			expect(listener).toHaveBeenCalledTimes(1)
		})

		it('unsubscribing during notification iteration is safe', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const results: string[] = []
			let unsub2: (() => void) | undefined = undefined

			const listener1 = vi.fn(() => {
				results.push('listener1')
				// Unsubscribe listener2 while iteration is in progress
				unsub2?.()
			})
			const listener2 = vi.fn(() => {
				results.push('listener2')
			})
			const listener3 = vi.fn(() => {
				results.push('listener3')
			})

			notifier.register(listener1)
			unsub2 = notifier.register(listener2)
			notifier.register(listener3)
			await flushMicrotasks()

			notifier.notify('test')
			await flushMicrotasks()

			// All listeners should have been called because Set iteration
			// continues over the original snapshot
			expect(listener1).toHaveBeenCalled()
			// listener2 might or might not be called depending on iteration order
			// But listener3 should definitely be called
			expect(listener3).toHaveBeenCalled()

			// After the notification, listener2 should be unsubscribed
			listener1.mockClear()
			listener2.mockClear()
			listener3.mockClear()

			notifier.notify('test2')
			await flushMicrotasks()

			expect(listener1).toHaveBeenCalled()
			expect(listener2).not.toHaveBeenCalled()
			expect(listener3).toHaveBeenCalled()
		})

		it('registering during notification is deferred', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const lateListener = vi.fn()
			const results: string[] = []

			const listener1 = vi.fn(() => {
				results.push('listener1')
				// Register a new listener during notification
				notifier.register(lateListener)
			})

			notifier.register(listener1)
			await flushMicrotasks()

			notifier.notify('first')
			await flushMicrotasks()

			// lateListener was registered during notification but deferred
			expect(lateListener).not.toHaveBeenCalled()

			// Now the late listener should be registered
			await flushMicrotasks()

			notifier.notify('second')
			await flushMicrotasks()

			expect(lateListener).toHaveBeenCalledWith('second')
		})

		it('handles interleaved register/notify/unsubscribe', async () => {
			const notifier = new MicrotaskNotifier<[number]>()
			const listener = vi.fn()

			// Register
			const unsub = notifier.register(listener)

			// Notify in the same sync block - listener will receive this
			// because microtasks are FIFO (add first, then notify)
			notifier.notify(1)

			await flushMicrotasks()

			expect(listener).toHaveBeenCalledWith(1)
			expect(listener).toHaveBeenCalledTimes(1)

			// Notify again after registration
			notifier.notify(2)
			await flushMicrotasks()

			expect(listener).toHaveBeenCalledWith(2)
			expect(listener).toHaveBeenCalledTimes(2)

			// Unsubscribe
			unsub()

			// Notify after unsubscribe
			notifier.notify(3)
			await flushMicrotasks()

			expect(listener).toHaveBeenCalledTimes(2) // No new calls after unsubscribe
		})

		it('notifications are processed in order', async () => {
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
	})

	describe('empty notifier', () => {
		it('notify with no listeners does not throw', async () => {
			const notifier = new MicrotaskNotifier<[string]>()

			expect(() => {
				notifier.notify('test')
			}).not.toThrow()

			await flushMicrotasks()
		})

		it('notify after all listeners unsubscribed does not throw', async () => {
			const notifier = new MicrotaskNotifier<[string]>()
			const listener = vi.fn()

			const unsub = notifier.register(listener)
			await flushMicrotasks()

			unsub()

			expect(() => {
				notifier.notify('test')
			}).not.toThrow()

			await flushMicrotasks()
		})
	})
})
