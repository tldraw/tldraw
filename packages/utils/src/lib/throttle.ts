const isTest = () =>
	typeof process !== 'undefined' &&
	process.env.NODE_ENV === 'test' &&
	// @ts-expect-error
	!globalThis.__FORCE_RAF_IN_TESTS__

const fpsQueue: Array<() => void> = []
const targetFps = 60
const targetTimePerFrame = Math.ceil(1000 / targetFps)
let frameRaf = undefined as undefined | number
let flushRaf = undefined as undefined | number
let last = -targetTimePerFrame

const flush = () => {
	const queue = fpsQueue.splice(0, fpsQueue.length)
	for (const fn of queue) {
		fn()
	}
}

// This tick is called immediately (ie, not as a callback to a requestAnimationFrame)
function tick(isOnNextFrame = false) {
	if (frameRaf) return

	const now = Date.now()
	const elapsed = now - last

	if (elapsed < targetTimePerFrame) {
		// Mark that we're waiting for the next frame
		// eslint-disable-next-line no-restricted-globals
		frameRaf = requestAnimationFrame(() => {
			frameRaf = undefined
			tick(true)
		})
	}

	// If we're on the next frame, we need to wait for the next frame to run the flush
	if (isOnNextFrame) {
		// If we already waited for the next frame to run the tick, that means it will also run this frame, we don't need to do anything here
		if (flushRaf) return
		last = now
		flush()
	} else {
		if (flushRaf) return
		// Since we're not already on the "next frame", we need to wait until the next frame to flush
		// eslint-disable-next-line no-restricted-globals
		flushRaf = requestAnimationFrame(() => {
			flushRaf = undefined
			last = now
			flush()
		})
	}
}

/**
 * Returns a throttled version of the function that will only be called max once per frame.
 * The target frame rate is 60fps.
 * @param fn - the fun to return a throttled version of
 * @returns
 * @internal
 */
export function fpsThrottle(fn: { (): void; cancel?(): void }): {
	(): void
	cancel?(): void
} {
	if (isTest()) {
		// Some redundancy here to make sure we're not cancelling a frame that's already been flushed
		fn.cancel = () => frameRaf && cancelAnimationFrame(frameRaf)
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
 * Calls the function on the next frame. The target frame rate is 60fps.
 * If the same fn is passed again before the next frame, it will still be called only once.
 * @param fn - the fun to call on the next frame
 * @returns a function that will cancel the call if called before the next frame
 * @internal
 */
export function throttleToNextFrame(fn: () => void): () => void {
	if (isTest()) {
		fn()
		return () => {
			// noop
		}
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
