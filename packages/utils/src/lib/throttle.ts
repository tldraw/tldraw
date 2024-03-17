import { globalTick } from './global-tick'

const isTest = () =>
	typeof process !== 'undefined' &&
	process.env.NODE_ENV === 'test' &&
	// @ts-expect-error
	!globalThis.__FORCE_RAF_IN_TESTS__

/**
 * Returns a throttled version of the function that will only be called max once per frame.
 * The target frame rate is 60fps.
 * @param fn - the fun to return a throttled version of
 * @returns
 * @internal
 */
export function fpsThrottle(fn: () => void) {
	if (isTest()) {
		return fn
	}

	return () => {
		globalTick.addListener(fn)
	}
}

/**
 * Calls the function on the next frame. The target frame rate is 60fps.
 * If the same fn is passed again before the next frame, it will still be called only once.
 * @param fn - the fun to call on the next frame
 * @returns
 * @internal
 */
export function throttleToNextFrame(fn: () => void) {
	if (isTest()) {
		return fn()
	}

	globalTick.addListener(fn)
}
