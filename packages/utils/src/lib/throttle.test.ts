import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FpsScheduler, fpsThrottle, throttleToNextFrame } from './throttle'

describe('FpsScheduler class', () => {
	let rafCallbacks: Array<FrameRequestCallback> = []
	let rafId = 0

	beforeEach(() => {
		// Force RAF behavior in tests instead of immediate execution
		// @ts-expect-error - testing flag
		globalThis.__FORCE_RAF_IN_TESTS__ = true
		vi.useFakeTimers()
		vi.clearAllMocks()

		rafCallbacks = []
		rafId = 0

		// Mock requestAnimationFrame to work with fake timers
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			const id = ++rafId
			rafCallbacks.push(callback)
			return id
		})

		vi.stubGlobal('cancelAnimationFrame', (_id: number) => {
			// Simple cancel implementation
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.useRealTimers()
	})

	const flushAnimationFrames = () => {
		// May need to flush multiple times as tick() can schedule nested RAF calls
		// But limit iterations to prevent infinite loops
		let iterations = 0
		const maxIterations = 10
		while (rafCallbacks.length > 0 && iterations < maxIterations) {
			const callbacks = [...rafCallbacks]
			rafCallbacks = []
			callbacks.forEach((cb) => cb(performance.now()))
			iterations++
		}
	}

	describe('FPS throttling', () => {
		it('should throttle to the target FPS', () => {
			const throttle = new FpsScheduler(60) // ~16.67ms per frame, ~15ms with variance
			const fn = vi.fn()
			const throttled = throttle.fpsThrottle(fn)

			throttled()
			expect(fn).not.toHaveBeenCalled()

			// Flush the first frame
			flushAnimationFrames()
			expect(fn).toHaveBeenCalledTimes(1)

			// Call again immediately (within same frame period)
			throttled()
			flushAnimationFrames()

			// Should not execute again yet (not enough time passed)
			expect(fn).toHaveBeenCalledTimes(1)

			// Wait for next frame period (16ms+)
			vi.advanceTimersByTime(16)
			throttled()
			flushAnimationFrames()

			// Now it should execute
			expect(fn).toHaveBeenCalledTimes(2)
		})

		it('should respect different FPS settings for different instances', () => {
			const fastThrottle = new FpsScheduler(120) // ~8.33ms per frame, ~7.5ms with variance
			const slowThrottle = new FpsScheduler(30) // ~33.33ms per frame, ~30ms with variance

			const fastFn = vi.fn()
			const slowFn = vi.fn()

			const throttledFast = fastThrottle.fpsThrottle(fastFn)
			const throttledSlow = slowThrottle.fpsThrottle(slowFn)

			// Call both - they should both queue and wait for RAF
			throttledFast()
			throttledSlow()

			// Flush RAF - both will execute on first frame
			flushAnimationFrames()

			expect(fastFn).toHaveBeenCalledTimes(1)
			expect(slowFn).toHaveBeenCalledTimes(1)

			// Call again immediately
			throttledFast()
			throttledSlow()

			// Advance by 8ms - fast can execute again, slow cannot
			vi.advanceTimersByTime(8)
			flushAnimationFrames()

			expect(fastFn).toHaveBeenCalledTimes(2)
			expect(slowFn).toHaveBeenCalledTimes(1)

			// Advance by another 25ms (33ms total) - now slow should execute
			vi.advanceTimersByTime(25)
			throttledSlow()
			flushAnimationFrames()

			expect(slowFn).toHaveBeenCalledTimes(2)
		})
	})

	describe('throttleToNextFrame', () => {
		it('should execute function on next frame', () => {
			const throttle = new FpsScheduler(120)
			const fn = vi.fn()

			throttle.throttleToNextFrame(fn)

			expect(fn).not.toHaveBeenCalled()

			flushAnimationFrames()

			expect(fn).toHaveBeenCalledTimes(1)
		})

		it('should deduplicate same function in queue', () => {
			const throttle = new FpsScheduler(120)
			const fn = vi.fn()

			throttle.throttleToNextFrame(fn)
			throttle.throttleToNextFrame(fn)
			throttle.throttleToNextFrame(fn)

			flushAnimationFrames()

			// Should only execute once despite multiple calls
			expect(fn).toHaveBeenCalledTimes(1)
		})

		it('should return cancel function that prevents execution', () => {
			const throttle = new FpsScheduler(120)
			const fn = vi.fn()

			const cancel = throttle.throttleToNextFrame(fn)
			cancel()

			flushAnimationFrames()

			expect(fn).not.toHaveBeenCalled()
		})

		it('should execute multiple different functions', () => {
			const throttle = new FpsScheduler(120)
			const fn1 = vi.fn()
			const fn2 = vi.fn()
			const fn3 = vi.fn()

			throttle.throttleToNextFrame(fn1)
			throttle.throttleToNextFrame(fn2)
			throttle.throttleToNextFrame(fn3)

			flushAnimationFrames()

			expect(fn1).toHaveBeenCalledTimes(1)
			expect(fn2).toHaveBeenCalledTimes(1)
			expect(fn3).toHaveBeenCalledTimes(1)
		})
	})

	describe('cancel functionality', () => {
		it('should cancel pending throttled function', () => {
			const throttle = new FpsScheduler(120)
			const fn = vi.fn()
			const throttled = throttle.fpsThrottle(fn)

			throttled()
			expect(fn).not.toHaveBeenCalled()

			throttled.cancel?.()

			flushAnimationFrames()

			expect(fn).not.toHaveBeenCalled()
		})

		it('should allow function to be called again after cancel', () => {
			const throttle = new FpsScheduler(120)
			const fn = vi.fn()
			const throttled = throttle.fpsThrottle(fn)

			throttled()
			throttled.cancel?.()

			flushAnimationFrames()
			expect(fn).not.toHaveBeenCalled()

			// Call again after cancel - need to advance time to allow re-throttling
			vi.advanceTimersByTime(10)
			throttled()
			flushAnimationFrames()

			expect(fn).toHaveBeenCalledTimes(1)
		})
	})

	describe('batching behavior', () => {
		it('should batch multiple calls within same frame window', () => {
			const throttle = new FpsScheduler(60)
			const fn = vi.fn()
			const throttled = throttle.fpsThrottle(fn)

			// Multiple calls in quick succession
			throttled()
			throttled()
			throttled()
			throttled()

			flushAnimationFrames()

			// Should only execute once
			expect(fn).toHaveBeenCalledTimes(1)
		})

		it('should maintain execution order', () => {
			const throttle = new FpsScheduler(120)
			const results: number[] = []

			const fn1 = () => results.push(1)
			const fn2 = () => results.push(2)
			const fn3 = () => results.push(3)

			throttle.throttleToNextFrame(fn1)
			throttle.throttleToNextFrame(fn2)
			throttle.throttleToNextFrame(fn3)

			flushAnimationFrames()

			expect(results).toEqual([1, 2, 3])
		})
	})
})

describe('global fpsThrottle function', () => {
	it('should create a throttled function with cancel method', () => {
		const fn = vi.fn()
		const throttled = fpsThrottle(fn)

		// Should return a function with cancel method
		expect(typeof throttled).toBe('function')
		expect(typeof throttled.cancel).toBe('function')

		// Calling it should work (actual execution depends on test mode)
		throttled()

		// Function should be callable without error
		expect(() => throttled()).not.toThrow()
	})

	it('should delegate to default FpsScheduler instance', () => {
		// This test just verifies the API works, not the RAF behavior
		// (RAF behavior is tested thoroughly in the FpsScheduler class tests)
		const fn1 = vi.fn()
		const fn2 = vi.fn()

		const throttled1 = fpsThrottle(fn1)
		const throttled2 = fpsThrottle(fn2)

		expect(throttled1).not.toBe(throttled2)
		expect(typeof throttled1.cancel).toBe('function')
		expect(typeof throttled2.cancel).toBe('function')
	})
})

describe('global throttleToNextFrame function', () => {
	it('should return a cancel function', () => {
		const fn = vi.fn()

		const cancel = throttleToNextFrame(fn)

		// Should return a function
		expect(typeof cancel).toBe('function')

		// Cancel should be callable
		expect(() => cancel()).not.toThrow()
	})

	it('should delegate to default FpsScheduler instance', () => {
		// This test just verifies the API works, not the RAF behavior
		// (RAF behavior is tested thoroughly in the FpsScheduler class tests)
		const fn1 = vi.fn()
		const fn2 = vi.fn()

		const cancel1 = throttleToNextFrame(fn1)
		const cancel2 = throttleToNextFrame(fn2)

		expect(typeof cancel1).toBe('function')
		expect(typeof cancel2).toBe('function')

		// Both should be callable
		expect(() => cancel1()).not.toThrow()
		expect(() => cancel2()).not.toThrow()
	})
})

describe('real-world scenarios', () => {
	let rafCallbacks: Array<FrameRequestCallback> = []
	let rafId = 0

	beforeEach(() => {
		// @ts-expect-error - testing flag
		globalThis.__FORCE_RAF_IN_TESTS__ = true
		vi.useFakeTimers()
		vi.clearAllMocks()

		rafCallbacks = []
		rafId = 0

		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			const id = ++rafId
			rafCallbacks.push(callback)
			return id
		})

		vi.stubGlobal('cancelAnimationFrame', (_id: number) => {
			// Simple cancel implementation
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.useRealTimers()
	})

	const flushAnimationFrames = () => {
		// May need to flush multiple times as tick() can schedule nested RAF calls
		// But limit iterations to prevent infinite loops
		let iterations = 0
		const maxIterations = 10
		while (rafCallbacks.length > 0 && iterations < maxIterations) {
			const callbacks = [...rafCallbacks]
			rafCallbacks = []
			callbacks.forEach((cb) => cb(performance.now()))
			iterations++
		}
	}

	it('simulates UI throttle (120fps) and sync throttle (30fps) working independently', () => {
		// UI operations at 120fps (~7.5ms per frame with variance)
		const uiThrottle = new FpsScheduler(120)
		const updateUI = vi.fn()
		const throttledUI = uiThrottle.fpsThrottle(updateUI)

		// Sync operations at 30fps (~30ms per frame with variance)
		const syncThrottle = new FpsScheduler(30)
		const syncData = vi.fn()
		const throttledSync = syncThrottle.fpsThrottle(syncData)

		// Simulate rapid UI updates and sync requests
		throttledUI()
		throttledUI()
		throttledSync()
		throttledSync()

		// First RAF flush - both execute on first frame
		flushAnimationFrames()

		expect(updateUI).toHaveBeenCalledTimes(1)
		expect(syncData).toHaveBeenCalledTimes(1)

		// More rapid calls immediately
		throttledUI()
		throttledSync()
		flushAnimationFrames()

		// Neither should execute yet (not enough time passed)
		expect(updateUI).toHaveBeenCalledTimes(1)
		expect(syncData).toHaveBeenCalledTimes(1)

		// Advance 8ms - UI can execute again, sync still waiting
		vi.advanceTimersByTime(8)
		throttledUI()
		flushAnimationFrames()

		expect(updateUI).toHaveBeenCalledTimes(2)
		expect(syncData).toHaveBeenCalledTimes(1)

		// Advance another 25ms (33ms total) - now sync should execute
		vi.advanceTimersByTime(25)
		throttledSync()
		flushAnimationFrames()

		expect(syncData).toHaveBeenCalledTimes(2)
	})

	it('simulates switching between solo (1fps) and collaborative mode (30fps)', () => {
		const throttle = new FpsScheduler(30) // Start at collaborative mode (~30ms per frame)
		const syncFn = vi.fn()
		const throttled = throttle.fpsThrottle(syncFn)

		// Call in collaborative mode
		throttled()
		flushAnimationFrames()

		expect(syncFn).toHaveBeenCalledTimes(1)

		// Call again after enough time
		vi.advanceTimersByTime(31)
		throttled()
		flushAnimationFrames()

		expect(syncFn).toHaveBeenCalledTimes(2)

		// Note: In real implementation, you'd recreate the throttle with new FPS
		// This test shows that each instance maintains its own FPS setting
		const soloThrottle = new FpsScheduler(1) // ~900ms per frame with variance
		const soloSyncFn = vi.fn()
		const soloThrottled = soloThrottle.fpsThrottle(soloSyncFn)

		soloThrottled()
		flushAnimationFrames()

		expect(soloSyncFn).toHaveBeenCalledTimes(1)

		// Call again too soon
		soloThrottled()
		flushAnimationFrames()

		// Should not execute yet
		expect(soloSyncFn).toHaveBeenCalledTimes(1)

		// Advance enough time for 1fps
		vi.advanceTimersByTime(1000)
		soloThrottled()
		flushAnimationFrames()

		expect(soloSyncFn).toHaveBeenCalledTimes(2)
	})
})
