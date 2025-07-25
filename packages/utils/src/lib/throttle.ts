const isTest = () =>
	typeof process !== 'undefined' &&
	process.env.NODE_ENV === 'test' &&
	// @ts-expect-error
	!globalThis.__FORCE_RAF_IN_TESTS__

const fpsQueue: Array<() => void> = []
let targetFps = 60
let targetTimePerFrame = Math.floor(1000 / targetFps) * 0.9 // Allow for some variance as browsers aren't that precise

const setTargetFps = (fps: number) => {
	targetFps = fps
	targetTimePerFrame = Math.floor(1000 / targetFps) * 0.9 // Allow for some variance as browsers aren't that precise
}

const initializeFpsDetection = () => {
	// eslint-disable-next-line no-restricted-globals
	if (isTest() || typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined')
		return

	let frameCount = 0
	let checkCount = 0
	const maxChecks = 60
	// Well count frames for this duration
	const checkDuration = 200
	// We'll then have to use this factor to calculate the FPS
	const factor = 1000 / checkDuration
	let checkStartTime = performance.now()

	const countFrames = () => {
		frameCount++
		const elapsed = performance.now() - checkStartTime

		if (elapsed < checkDuration) {
			// eslint-disable-next-line no-restricted-globals
			requestAnimationFrame(countFrames)
		} else {
			checkCount++
			const fps = frameCount * factor
			if (fps >= 100) {
				setTargetFps(120)
				return
			} else if (fps > targetFps) {
				setTargetFps(fps)
			}

			// Continue checking for the full duration to find the maximum possible FPS
			if (checkCount < maxChecks) {
				frameCount = 0
				checkStartTime = performance.now()
				// eslint-disable-next-line no-restricted-globals
				requestAnimationFrame(countFrames)
			}
		}
	}

	// Wait a bit before starting the frame count to allow the browser to settle
	// eslint-disable-next-line no-restricted-globals
	setTimeout(() => {
		// eslint-disable-next-line no-restricted-globals
		requestAnimationFrame(countFrames)
	}, 500)
}

// Initialize fps detection when the module loads
initializeFpsDetection()

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
 * Returns a throttled version of the function that will only be called max once per frame.
 * The target frame rate is 60fps by default, but will automatically increase to the maximum
 * detected frame rate if the browser supports higher refresh rates.
 * @param fn - the fun to return a throttled version of
 * @returns
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
 * Calls the function on the next frame. The target frame rate is 60fps by default,
 * but will automatically increase to the maximum detected frame rate if the browser supports higher refresh rates.
 * If the same fn is passed again before the next frame, it will still be called only once.
 * @param fn - the fun to call on the next frame
 * @returns a function that will cancel the call if called before the next frame
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
