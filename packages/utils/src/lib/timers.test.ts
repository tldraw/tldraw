import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Timers } from './timers'

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
		const mockCancelAnimationFrame = vi.fn()

		vi.stubGlobal('setTimeout', vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(2))
		vi.stubGlobal('setInterval', vi.fn().mockReturnValue(3))
		vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(4))
		vi.stubGlobal('clearTimeout', mockClearTimeout)
		vi.stubGlobal('clearInterval', mockClearInterval)
		vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame)

		timers.setTimeout('context1', () => {}, 1000)
		timers.setTimeout('context2', () => {}, 2000)
		timers.setInterval('context1', () => {}, 500)
		// A context that only holds an animation frame must be disposed too
		timers.requestAnimationFrame('context3', () => {})

		timers.disposeAll()

		expect(mockClearTimeout).toHaveBeenCalledWith(1)
		expect(mockClearTimeout).toHaveBeenCalledWith(2)
		expect(mockClearInterval).toHaveBeenCalledWith(3)
		expect(mockCancelAnimationFrame).toHaveBeenCalledWith(4)

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

	describe('pruning tracked ids', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
			vi.restoreAllMocks()
		})

		it('stops tracking a timeout once it has fired', () => {
			const timers = new Timers()
			const handler = vi.fn()

			const fired = timers.setTimeout('ctx', handler, 100)
			const pending = timers.setTimeout('ctx', () => {}, 1000)
			vi.advanceTimersByTime(100)
			expect(handler).toHaveBeenCalledTimes(1)

			const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
			timers.dispose('ctx')

			expect(clearTimeoutSpy.mock.calls).toEqual([[pending]])
			expect(clearTimeoutSpy).not.toHaveBeenCalledWith(fired)
		})

		it('stops tracking an animation frame once it has run', () => {
			const timers = new Timers()
			const callback = vi.fn()

			const ran = timers.requestAnimationFrame('ctx', callback)
			vi.advanceTimersToNextFrame()
			expect(callback).toHaveBeenCalledTimes(1)
			expect(callback.mock.calls[0][0]).toEqual(expect.any(Number))

			const pending = timers.requestAnimationFrame('ctx', () => {})
			const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
			timers.dispose('ctx')

			expect(cancelSpy.mock.calls).toEqual([[pending]])
			expect(cancelSpy).not.toHaveBeenCalledWith(ran)
		})

		// The sync fuzz suite stubs requestAnimationFrame to run its callback synchronously, so the
		// wrapper runs before the id it would prune has been assigned.
		it('survives a timer that fires before its id is returned', () => {
			const timers = new Timers()
			vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
				cb(0)
				return 7
			})
			vi.stubGlobal('setTimeout', (handler: () => void) => {
				handler()
				return 8
			})
			const frameCallback = vi.fn()
			const timeoutHandler = vi.fn()

			expect(timers.requestAnimationFrame('ctx', frameCallback)).toBe(7)
			expect(timers.setTimeout('ctx', timeoutHandler, 0)).toBe(8)
			expect(frameCallback).toHaveBeenCalledTimes(1)
			expect(timeoutHandler).toHaveBeenCalledTimes(1)

			const cancelSpy = vi.fn()
			const clearSpy = vi.fn()
			vi.stubGlobal('cancelAnimationFrame', cancelSpy)
			vi.stubGlobal('clearTimeout', clearSpy)
			timers.dispose('ctx')
			expect(cancelSpy).not.toHaveBeenCalled()
			expect(clearSpy).not.toHaveBeenCalled()
			vi.unstubAllGlobals()
		})

		it('stops tracking timers cleared through the instance', () => {
			const timers = new Timers()
			const timeoutHandler = vi.fn()
			const intervalHandler = vi.fn()
			const frameCallback = vi.fn()

			const timeout = timers.setTimeout('ctx', timeoutHandler, 100)
			const interval = timers.setInterval('ctx', intervalHandler, 100)
			const frame = timers.requestAnimationFrame('ctx', frameCallback)

			timers.clearTimeout('ctx', timeout)
			timers.clearInterval('ctx', interval)
			timers.cancelAnimationFrame('ctx', frame)

			vi.advanceTimersByTime(1000)
			expect(timeoutHandler).not.toHaveBeenCalled()
			expect(intervalHandler).not.toHaveBeenCalled()
			expect(frameCallback).not.toHaveBeenCalled()

			const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
			const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
			const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
			timers.dispose('ctx')

			expect(clearTimeoutSpy).not.toHaveBeenCalled()
			expect(clearIntervalSpy).not.toHaveBeenCalled()
			expect(cancelSpy).not.toHaveBeenCalled()
		})

		it('ignores undefined ids when clearing', () => {
			const timers = new Timers()
			const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

			timers.clearTimeout('ctx', undefined)
			timers.clearInterval('ctx', undefined)
			timers.cancelAnimationFrame('ctx', undefined)

			expect(clearTimeoutSpy).not.toHaveBeenCalled()
		})

		it('keeps tracking an interval until it is cleared or disposed', () => {
			const timers = new Timers()
			const handler = vi.fn()

			const interval = timers.setInterval('ctx', handler, 100)
			vi.advanceTimersByTime(350)
			expect(handler).toHaveBeenCalledTimes(3)

			const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
			timers.dispose('ctx')

			expect(clearIntervalSpy.mock.calls).toEqual([[interval]])
			vi.advanceTimersByTime(1000)
			expect(handler).toHaveBeenCalledTimes(3)
		})

		it('does not grow the tracked set as timeouts fire and are cleared', () => {
			const timers = new Timers()
			const context = timers.forContext('ctx')

			for (let i = 0; i < 100; i++) {
				// Mirrors a pointer down and up: a long-press timeout that is cleared before it fires,
				// and a click timeout that is left to fire on its own.
				const longPress = context.setTimeout(() => {}, 500)
				context.setTimeout(() => {}, 200)
				context.clearTimeout(longPress)
				vi.advanceTimersByTime(300)
			}

			const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
			context.dispose()

			expect(clearTimeoutSpy).not.toHaveBeenCalled()
		})

		it('passes the timer arguments through to the handler when it fires', () => {
			const timers = new Timers()
			const handler = vi.fn()

			timers.setTimeout('ctx', handler, 10, 'a', 'b')
			vi.advanceTimersByTime(10)

			expect(handler).toHaveBeenCalledWith(['a', 'b'])
		})
	})
})
