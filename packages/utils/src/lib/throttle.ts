const isTest = () =>
	typeof process !== 'undefined' &&
	process.env.NODE_ENV === 'test' &&
	// @ts-expect-error
	!globalThis.__FORCE_RAF_IN_TESTS__

// Browsers aren't precise with frame timing - this factor prevents skipping frames unnecessarily
// by aiming slightly below the theoretical frame duration (e.g., ~7.5ms instead of 8.33ms for 120fps)
const timingVarianceFactor = 0.9
const getTargetTimePerFrame = (targetFps: number) =>
	Math.floor(1000 / targetFps) * timingVarianceFactor

/**
 * A scheduler class that manages a queue of functions to be executed at a target frame rate.
 * Each instance maintains its own queue and state, allowing for separate throttling contexts
 * (e.g., UI operations vs network sync operations).
 *
 * @public
 */
export class FpsScheduler {
	private targetFps: number
	private targetTimePerFrame: number
	private fpsQueue: Array<() => void> = []
	private frameRaf: undefined | number
	private flushRaf: undefined | number
	private lastFlushTime: number

	constructor(targetFps: number = 120) {
		this.targetFps = targetFps
		this.targetTimePerFrame = getTargetTimePerFrame(targetFps)
		this.lastFlushTime = -this.targetTimePerFrame
	}

	updateTargetFps(targetFps: number) {
		if (targetFps === this.targetFps) return
		this.targetFps = targetFps
		this.targetTimePerFrame = getTargetTimePerFrame(targetFps)
		this.lastFlushTime = -this.targetTimePerFrame
	}

	private flush() {
		const queue = this.fpsQueue.splice(0, this.fpsQueue.length)
		for (const fn of queue) {
			fn()
		}
	}

	private tick(isOnNextFrame = false) {
		if (this.frameRaf) return

		const now = Date.now()
		const elapsed = now - this.lastFlushTime

		if (elapsed < this.targetTimePerFrame) {
			// If we're too early to flush, we need to wait until the next frame to try and flush again.
			// eslint-disable-next-line no-restricted-globals
			this.frameRaf = requestAnimationFrame(() => {
				this.frameRaf = undefined
				this.tick(true)
			})
			return
		}

		if (isOnNextFrame) {
			// If we've already waited for the next frame to run the tick, then we can flush immediately
			if (this.flushRaf) return // ...though if there's a flush raf, that means we'll be flushing on this frame already, so we can do nothing here.
			this.lastFlushTime = now
			this.flush()
		} else {
			// If we haven't already waited for the next frame to run the tick, we need to wait until the next frame to flush.
			if (this.flushRaf) return // ...though if there's a flush raf, that means we'll be flushing on the next frame already, so we can do nothing here.
			// eslint-disable-next-line no-restricted-globals
			this.flushRaf = requestAnimationFrame(() => {
				this.flushRaf = undefined
				this.lastFlushTime = Date.now()
				this.flush()
			})
		}
	}

	/**
	 * Creates a throttled version of a function that executes at most once per frame.
	 * The default target frame rate is set by the FpsScheduler instance.
	 * Subsequent calls within the same frame are ignored, ensuring smooth performance
	 * for high-frequency events like mouse movements or scroll events.
	 *
	 * @param fn - The function to throttle, optionally with a cancel method
	 * @returns A throttled function with an optional cancel method to remove pending calls
	 *
	 * @public
	 */
	fpsThrottle(fn: { (): void; cancel?(): void }): {
		(): void
		cancel?(): void
	} {
		if (isTest()) {
			fn.cancel = () => {
				if (this.frameRaf) {
					cancelAnimationFrame(this.frameRaf)
					this.frameRaf = undefined
				}
				if (this.flushRaf) {
					cancelAnimationFrame(this.flushRaf)
					this.flushRaf = undefined
				}
			}
			return fn
		}

		const throttledFn = () => {
			if (this.fpsQueue.includes(fn)) {
				return
			}
			this.fpsQueue.push(fn)
			this.tick()
		}
		throttledFn.cancel = () => {
			const index = this.fpsQueue.indexOf(fn)
			if (index > -1) {
				this.fpsQueue.splice(index, 1)
			}
		}
		return throttledFn
	}

	/**
	 * Schedules a function to execute on the next animation frame.
	 * If the same function is passed multiple times before the frame executes,
	 * it will only be called once, effectively batching multiple calls.
	 *
	 * @param fn - The function to execute on the next frame
	 * @returns A cancel function that can prevent execution if called before the next frame
	 *
	 * @public
	 */
	throttleToNextFrame(fn: () => void): () => void {
		if (isTest()) {
			fn()
			return () => void null // noop
		}

		if (!this.fpsQueue.includes(fn)) {
			this.fpsQueue.push(fn)
			this.tick()
		}

		return () => {
			const index = this.fpsQueue.indexOf(fn)
			if (index > -1) {
				this.fpsQueue.splice(index, 1)
			}
		}
	}
}

// Default instance for UI operations
const defaultScheduler = new FpsScheduler(120)

/**
 * Creates a throttled version of a function that executes at most once per frame.
 * The default target frame rate is 120fps, but can be customized per function.
 * Subsequent calls within the same frame are ignored, ensuring smooth performance
 * for high-frequency events like mouse movements or scroll events.
 *
 * Uses the default throttle instance for UI operations. If you need a separate
 * throttling queue (e.g., for network operations), create your own Throttle instance.
 *
 * @param fn - The function to throttle, optionally with a cancel method
 * @returns A throttled function with an optional cancel method to remove pending calls
 *
 * @example
 * ```ts
 * // Default 120fps throttling
 * const updateCanvas = fpsThrottle(() => {
 *   // This will run at most once per frame (~8.33ms)
 *   redrawCanvas()
 * })
 *
 * // Call as often as you want - automatically throttled to 120fps
 * document.addEventListener('mousemove', updateCanvas)
 *
 * // Cancel pending calls if needed
 * updateCanvas.cancel?.()
 * ```
 *
 * @internal
 */
export function fpsThrottle(fn: { (): void; cancel?(): void }): {
	(): void
	cancel?(): void
} {
	return defaultScheduler.fpsThrottle(fn)
}

/**
 * Schedules a function to execute on the next animation frame, targeting 120fps.
 * If the same function is passed multiple times before the frame executes,
 * it will only be called once, effectively batching multiple calls.
 *
 * Uses the default throttle instance for UI operations.
 *
 * @param fn - The function to execute on the next frame
 * @returns A cancel function that can prevent execution if called before the next frame
 *
 * @example
 * ```ts
 * const updateUI = throttleToNextFrame(() => {
 *   // Batches multiple calls into the next animation frame
 *   updateStatusBar()
 *   refreshToolbar()
 * })
 *
 * // Multiple calls within the same frame are batched
 * updateUI() // Will execute
 * updateUI() // Ignored (same function already queued)
 * updateUI() // Ignored (same function already queued)
 *
 * // Get cancel function to prevent execution
 * const cancel = updateUI()
 * cancel() // Prevents execution if called before next frame
 * ```
 *
 * @internal
 */
export function throttleToNextFrame(fn: () => void): () => void {
	return defaultScheduler.throttleToNextFrame(fn)
}
