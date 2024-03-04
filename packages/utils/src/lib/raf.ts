const isTest = () =>
	typeof process !== 'undefined' &&
	process.env.NODE_ENV === 'test' &&
	// @ts-expect-error
	!globalThis.__FORCE_RAF_IN_TESTS__

const rafQueue: Array<() => void> = []

const tick = () => {
	const queue = rafQueue.splice(0, rafQueue.length)
	for (const fn of queue) {
		fn()
	}
}

const fps = 60
const targetTimePerFrame = 1000 / fps
let frame: number | undefined
let time = 0
let last = 0
const timePerFrame = targetTimePerFrame

function sixtyFps() {
	if (frame) {
		return
	}
	const now = Date.now()
	const elapsed = now - last

	// Variable frame rate
	// if (elapsed < 1000 && elapsed > timePerFrame * 1.1) {
	// 	timePerFrame *= 2
	// } else if (elapsed < timePerFrame / 2) {
	// 	timePerFrame = Math.max(targetTimePerFrame, timePerFrame / 2)
	// }

	console.log('elapsed', elapsed, 'timePerFrame', timePerFrame)
	if (time + elapsed < timePerFrame) {
		frame = requestAnimationFrame(() => {
			frame = undefined
			sixtyFps()
		})
		return
	}
	frame = requestAnimationFrame(() => {
		frame = undefined
		last = now
		// If we fall behind more than 10 frames, we'll just reset the time so we don't
		// try to update a number of times
		time = Math.min(time + elapsed - targetTimePerFrame, targetTimePerFrame * 10)
		tick()
	})
}

let started = false

/**
 * Returns a throttled version of the function that will only be called max once per frame.
 * @param fn - the fun to return a throttled version of
 * @returns
 * @internal
 */
export function rafThrottle(fn: () => void) {
	if (isTest()) {
		return fn
	}

	return () => {
		if (rafQueue.includes(fn)) {
			return
		}
		rafQueue.push(fn)
		if (!started) {
			started = true
			last = Date.now() - targetTimePerFrame - 1
		}
		sixtyFps()
	}
}

/**
 * Calls the function on the next frame.
 * If the same fn is passed again before the next frame, it will still be called only once.
 * @param fn - the fun to call on the next animation frame
 * @returns
 * @internal
 */
export function throttledRaf(fn: () => void) {
	if (isTest()) {
		return fn()
	}

	if (rafQueue.includes(fn)) {
		return
	}

	rafQueue.push(fn)
	if (!started) {
		started = true
		last = Date.now() - targetTimePerFrame - 1
	}
	sixtyFps()
}
