/**
 * Get whether a value is not undefined.
 *
 * @param value - The value to check.
 * @public
 */
export function isDefined<T>(value: T): value is typeof value extends undefined ? never : T {
	return value !== undefined
}

/**
 * Get whether a value is null
 *
 * @param value - The value to check.
 * @public
 */
export function isNonNull<T>(value: T): value is typeof value extends null ? never : T {
	return value !== null
}

/**
 * Get whether a value is nullish (null, undefined).
 *
 * @param value - The value to check.
 * @public
 */
export function isNonNullish<T>(
	value: T
): value is typeof value extends undefined ? never : typeof value extends null ? never : T {
	return value !== null && value !== undefined
}

function getStructuredClone(): [<T>(i: T) => T, boolean] {
	if (typeof globalThis !== 'undefined' && (globalThis as any).structuredClone) {
		return [globalThis.structuredClone as <T>(i: T) => T, true]
	}

	if (typeof global !== 'undefined' && (global as any).structuredClone) {
		return [global.structuredClone as <T>(i: T) => T, true]
	}

	if (typeof window !== 'undefined' && (window as any).structuredClone) {
		return [window.structuredClone as <T>(i: T) => T, true]
	}

	return [<T>(i: T): T => (i ? JSON.parse(JSON.stringify(i)) : i), false]
}

const _structuredClone = getStructuredClone()

/**
 * Create a deep copy of a value. Uses the structuredClone API if available, otherwise uses JSON.parse(JSON.stringify()).
 *
 * @param i - The value to clone.
 * @public */
export const structuredClone = _structuredClone[0]

/**
 * @internal
 */
export const isNativeStructuredClone = _structuredClone[1]

/**
 * When we patch structuredClone in jsdom for testing (see https://github.com/jsdom/jsdom/issues/3363),
 * the Object that is used as a prototype for the cloned object is not the same as the Object in
 * the code under test (that comes from jsdom's fake global context). This constant is used in
 * our code to work around this case.
 *
 * This is also the case for Array prototype, but that problem can be worked around with an
 * Array.isArray() check.
 * @internal
 */
export const STRUCTURED_CLONE_OBJECT_PROTOTYPE = Object.getPrototypeOf(structuredClone({}))
