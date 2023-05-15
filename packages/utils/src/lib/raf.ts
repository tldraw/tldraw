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

let frame: number | undefined

function raf() {
	if (frame) {
		return
	}

	frame = requestAnimationFrame(() => {
		frame = undefined
		tick()
	})
}

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
		raf()
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
	raf()
}
