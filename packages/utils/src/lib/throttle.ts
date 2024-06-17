const isTest = () =>
	typeof process !== 'undefined' &&
	process.env.NODE_ENV === 'test' &&
	// @ts-expect-error
	!globalThis.__FORCE_RAF_IN_TESTS__

const fpsQueue: Array<() => void> = []
const targetFps = 60
const targetTimePerFrame = Math.ceil(1000 / targetFps)
let frame: number | undefined
let time = 0
let last = 0

const flush = () => {
	const queue = fpsQueue.splice(0, fpsQueue.length)
	for (const fn of queue) {
		fn()
	}
}

function tick() {
	if (frame) {
		return
	}
	const now = Date.now()
	const elapsed = now - last

	if (time + elapsed < targetTimePerFrame) {
		// It's up to the consumer of debounce to call `cancel`
		// eslint-disable-next-line no-restricted-globals
		frame = requestAnimationFrame(() => {
			frame = undefined
			tick()
		})
		return
	}
	// It's up to the consumer of debounce to call `cancel`
	// eslint-disable-next-line no-restricted-globals
	frame = requestAnimationFrame(() => {
		frame = undefined
		last = now
		// If we fall behind more than 10 frames, we'll just reset the time so we don't try to update a number of times
		// This can happen if we don't interact with the page for a while
		time = Math.min(time + elapsed - targetTimePerFrame, targetTimePerFrame * 10)
		flush()
	})
}

let started = false

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
		fn.cancel = () => frame && cancelAnimationFrame(frame)
		return fn
	}

	const throttledFn = () => {
		if (fpsQueue.includes(fn)) {
			return
		}
		fpsQueue.push(fn)
		if (!started) {
			started = true
			// We set last to Date.now() - targetTimePerFrame - 1 so that the first run will happen immediately
			last = Date.now() - targetTimePerFrame - 1
		}
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
		if (!started) {
			started = true
			// We set last to Date.now() - targetTimePerFrame - 1 so that the first run will happen immediately
			last = Date.now() - targetTimePerFrame - 1
		}
		tick()
	}

	return () => {
		const index = fpsQueue.indexOf(fn)
		if (index > -1) {
			fpsQueue.splice(index, 1)
		}
	}
}
