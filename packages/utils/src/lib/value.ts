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

/** @public */
export const structuredClone =
	typeof window !== 'undefined' && (window as any).structuredClone
		? (window.structuredClone as <T>(i: T) => T)
		: <T>(i: T): T => (i ? JSON.parse(JSON.stringify(i)) : i)
