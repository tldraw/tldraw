const isTest = () =>
	typeof process !== 'undefined' &&
	process.env.NODE_ENV === 'test' &&
	// @ts-expect-error
	!globalThis.__FORCE_RAF_IN_TESTS__

const fpsQueue: Array<() => void> = []
const targetFps = 60
const targetTimePerFrame = Math.floor(1000 / targetFps) * 0.9 // ~15ms - we allow for some variance as browsers aren't that precise.
let frameRaf: undefined | number
let flushRaf: undefined | number
let lastFlushTime = -targetTimePerFrame

const flush = () => {
	const queue = fpsQueue.splice(0, fpsQueue.length)
	for (const fn of queue) {
		fn()
	}
}

function tick(isOnNextFrame = false) {
	if (frameRaf) return

	const now = Date.now()
	const elapsed = now - lastFlushTime

	if (elapsed < targetTimePerFrame) {
		// If we're too early to flush, we need to wait until the next frame to try and flush again.
		// eslint-disable-next-line no-restricted-globals
		frameRaf = requestAnimationFrame(() => {
			frameRaf = undefined
			tick(true)
		})
		return
	}

	if (isOnNextFrame) {
		// If we've already waited for the next frame to run the tick, then we can flush immediately
		if (flushRaf) return // ...though if there's a flush raf, that means we'll be flushing on this frame already, so we can do nothing here.
		lastFlushTime = now
		flush()
	} else {
		// If we haven't already waited for the next frame to run the tick, we need to wait until the next frame to flush.
		if (flushRaf) return // ...though if there's a flush raf, that means we'll be flushing on the next frame already, so we can do nothing here.
		// eslint-disable-next-line no-restricted-globals
		flushRaf = requestAnimationFrame(() => {
			flushRaf = undefined
			lastFlushTime = now
			flush()
		})
	}
}

/**
 * Creates a throttled version of a function that executes at most once per frame (60fps).
 * Subsequent calls within the same frame are ignored, ensuring smooth performance
 * for high-frequency events like mouse movements or scroll events.
 *
 * @param fn - The function to throttle, optionally with a cancel method
 * @returns A throttled function with an optional cancel method to remove pending calls
 *
 * @example
 * ```ts
 * const updateCanvas = fpsThrottle(() => {
 *   // This will run at most once per frame (~16.67ms)
 *   redrawCanvas()
 * })
 *
 * // Call as often as you want - automatically throttled to 60fps
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
	if (isTest()) {
		fn.cancel = () => {
			if (frameRaf) {
				cancelAnimationFrame(frameRaf)
				frameRaf = undefined
			}
			if (flushRaf) {
				cancelAnimationFrame(flushRaf)
				flushRaf = undefined
			}
		}
		return fn
	}

	const throttledFn = () => {
		if (fpsQueue.includes(fn)) {
			return
		}
		fpsQueue.push(fn)
		tick()
	}
	throttledFn.cancel = () => {
		const index = fpsQueue.indexOf(fn)
		if (index > -1) {
			fpsQueue.splice(index, 1)
		}
	}
	return throttledFn
}

/**
 * Schedules a function to execute on the next animation frame, targeting 60fps.
 * If the same function is passed multiple times before the frame executes,
 * it will only be called once, effectively batching multiple calls.
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
	if (isTest()) {
		fn()
		return () => void null // noop
	}

	if (!fpsQueue.includes(fn)) {
		fpsQueue.push(fn)
		tick()
	}

	return () => {
		const index = fpsQueue.indexOf(fn)
		if (index > -1) {
			fpsQueue.splice(index, 1)
		}
	}
}
