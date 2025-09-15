/**
 * Get whether a value is not undefined.
 *
 * @param value - The value to check.
 * @returns True if the value is not undefined, with proper type narrowing.
 * @example
 * ```ts
 * const maybeString: string | undefined = getValue()
 *
 * if (isDefined(maybeString)) {
 *   // TypeScript knows maybeString is string, not undefined
 *   console.log(maybeString.toUpperCase())
 * }
 *
 * // Filter undefined values from arrays
 * const values = [1, undefined, 2, undefined, 3]
 * const definedValues = values.filter(isDefined) // [1, 2, 3]
 * ```
 * @public
 */
export function isDefined<T>(value: T): value is typeof value extends undefined ? never : T {
	return value !== undefined
}

/**
 * Get whether a value is not null.
 *
 * @param value - The value to check.
 * @returns True if the value is not null, with proper type narrowing.
 * @example
 * ```ts
 * const maybeString: string | null = getValue()
 *
 * if (isNonNull(maybeString)) {
 *   // TypeScript knows maybeString is string, not null
 *   console.log(maybeString.length)
 * }
 *
 * // Filter null values from arrays
 * const values = ["a", null, "b", null, "c"]
 * const nonNullValues = values.filter(isNonNull) // ["a", "b", "c"]
 * ```
 * @public
 */
export function isNonNull<T>(value: T): value is typeof value extends null ? never : T {
	return value !== null
}

/**
 * Get whether a value is not nullish (not null and not undefined).
 *
 * @param value - The value to check.
 * @returns True if the value is neither null nor undefined, with proper type narrowing.
 * @example
 * ```ts
 * const maybeString: string | null | undefined = getValue()
 *
 * if (isNonNullish(maybeString)) {
 *   // TypeScript knows maybeString is string, not null or undefined
 *   console.log(maybeString.charAt(0))
 * }
 *
 * // Filter nullish values from arrays
 * const values = ["hello", null, "world", undefined, "!"]
 * const cleanValues = values.filter(isNonNullish) // ["hello", "world", "!"]
 * ```
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
 * @returns A deep copy of the input value.
 * @example
 * ```ts
 * const original = { a: 1, b: { c: 2 } }
 * const copy = structuredClone(original)
 *
 * copy.b.c = 3
 * console.log(original.b.c) // 2 (unchanged)
 * console.log(copy.b.c) // 3
 *
 * // Works with complex objects
 * const complexObject = {
 *   date: new Date(),
 *   array: [1, 2, 3],
 *   nested: { deep: { value: "test" } }
 * }
 * const cloned = structuredClone(complexObject)
 * ```
 * @public
 */
export const structuredClone = _structuredClone[0]

/**
 * Whether the current environment has native structuredClone support.
 * @returns True if using native structuredClone, false if using JSON fallback.
 * @internal
 */
export const isNativeStructuredClone = _structuredClone[1]

/**
 * The prototype object used by structuredClone for cloned objects.
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
