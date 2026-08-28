import { afterEach, describe, expect, it, vi } from 'vitest'
import { Timers, cancelRaf, raf } from './timers'

afterEach(() => {
	vi.unstubAllGlobals()
	vi.useRealTimers()
})

describe('raf fallback', () => {
	// The headless frame loop rides on this: without requestAnimationFrame, raf must still
	// fire (via an unref'd timeout) and cancelRaf must still cancel it.
	it('fires the callback with a monotonic (not epoch) timestamp', () => {
		vi.useFakeTimers()
		vi.stubGlobal('requestAnimationFrame', undefined)
		vi.stubGlobal('cancelAnimationFrame', undefined)
		const cb = vi.fn()
		raf(cb)
		vi.advanceTimersByTime(20)
		expect(cb).toHaveBeenCalledTimes(1)
		// performance.now()-scale, not Date.now() — an epoch delta would wreck mixed consumers
		expect(cb.mock.calls[0][0]).toBeLessThan(Date.now() / 2)
	})

	it('cancelRaf cancels a fallback frame', () => {
		vi.useFakeTimers()
		vi.stubGlobal('requestAnimationFrame', undefined)
		vi.stubGlobal('cancelAnimationFrame', undefined)
		const cb = vi.fn()
		cancelRaf(raf(cb))
		vi.advanceTimersByTime(50)
		expect(cb).not.toHaveBeenCalled()
	})

	it('cancelRaf cancels a fallback frame even when cancelAnimationFrame exists', () => {
		// Mixed environment: raf chose the timeout fallback, so handing its id to
		// cancelAnimationFrame would miss it and the frame would still fire.
		vi.useFakeTimers()
		vi.stubGlobal('requestAnimationFrame', undefined)
		const cancelAnimationFrame = vi.fn()
		vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)
		const cb = vi.fn()
		cancelRaf(raf(cb))
		vi.advanceTimersByTime(50)
		expect(cb).not.toHaveBeenCalled()
		expect(cancelAnimationFrame).not.toHaveBeenCalled()
	})
})

describe('Timers', () => {
	it('tracks timers by context and disposes them correctly', () => {
		const timers = new Timers()
		const mockClearTimeout = vi.fn()
		const mockClearInterval = vi.fn()
		const mockCancelAnimationFrame = vi.fn()

		// Mock only the clear functions since those are what we need to verify
		vi.stubGlobal('setTimeout', vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(2))
		vi.stubGlobal('setInterval', vi.fn().mockReturnValue(3))
		vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(4))
		vi.stubGlobal('clearTimeout', mockClearTimeout)
		vi.stubGlobal('clearInterval', mockClearInterval)
		vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame)

		// Create timers in different contexts
		timers.setTimeout('context1', () => {}, 1000)
		timers.setTimeout('context1', () => {}, 2000)
		timers.setInterval('context1', () => {}, 500)
		timers.requestAnimationFrame('context2', () => {})

		// Dispose one context
		timers.dispose('context1')

		// Should clear timers for context1 but not context2
		expect(mockClearTimeout).toHaveBeenCalledWith(1)
		expect(mockClearTimeout).toHaveBeenCalledWith(2)
		expect(mockClearInterval).toHaveBeenCalledWith(3)
		expect(mockCancelAnimationFrame).not.toHaveBeenCalled()

		vi.unstubAllGlobals()
	})

	it('disposes all contexts with disposeAll', () => {
		const timers = new Timers()
		const mockClearTimeout = vi.fn()
		const mockClearInterval = vi.fn()

		vi.stubGlobal('setTimeout', vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(2))
		vi.stubGlobal('setInterval', vi.fn().mockReturnValue(3))
		vi.stubGlobal('clearTimeout', mockClearTimeout)
		vi.stubGlobal('clearInterval', mockClearInterval)

		timers.setTimeout('context1', () => {}, 1000)
		timers.setTimeout('context2', () => {}, 2000)
		timers.setInterval('context1', () => {}, 500)

		timers.disposeAll()

		expect(mockClearTimeout).toHaveBeenCalledWith(1)
		expect(mockClearTimeout).toHaveBeenCalledWith(2)
		expect(mockClearInterval).toHaveBeenCalledWith(3)

		vi.unstubAllGlobals()
	})

	it('provides context-bound methods via forContext', () => {
		const timers = new Timers()
		const mockClearTimeout = vi.fn()

		vi.stubGlobal('setTimeout', vi.fn().mockReturnValue(1))
		vi.stubGlobal('clearTimeout', mockClearTimeout)

		const contextTimers = timers.forContext('test-context')
		contextTimers.setTimeout(() => {}, 1000)
		contextTimers.dispose()

		expect(mockClearTimeout).toHaveBeenCalledWith(1)

		vi.unstubAllGlobals()
	})

	it('passes extra args to the handler individually, as documented', () => {
		// The handler used to receive the args as one array, contradicting the doc.
		vi.useFakeTimers()
		const timers = new Timers()
		const spy = vi.fn()
		timers.setTimeout('args', spy, 0, 'a', 'b')
		vi.advanceTimersByTime(1)
		expect(spy).toHaveBeenCalledWith('a', 'b')
		timers.disposeAll()
	})
})
