/**
 * Returns true if the given value is a computed signal.
 * This is a type guard function that can be used to check if a value is a computed signal instance.
 *
 * @example
 * ```ts
 * const count = atom('count', 0)
 * const double = computed('double', () => count.get() * 2)
 *
 * console.log(isComputed(count))  // false
 * console.log(isComputed(double)) // true
 * ```
 *
 * @param value - The value to check
 * @returns True if the value is a computed signal, false otherwise
 * @public
 */
export function isComputed(value: any): boolean {
	return !!(value && value.__isComputed === true)
}
