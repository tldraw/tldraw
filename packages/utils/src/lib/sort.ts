/**
 * Compares two objects by their id property for use with Array.sort().
 * Sorts objects in ascending order based on their id values.
 *
 * @param a - First object to compare
 * @param b - Second object to compare
 * @returns 1 if a.id \> b.id, -1 if a.id \<= b.id
 *
 * @example
 * ```ts
 * const items = [
 *   { id: 'c', name: 'Charlie' },
 *   { id: 'a', name: 'Alice' },
 *   { id: 'b', name: 'Bob' },
 * ]
 *
 * const sorted = items.sort(sortById)
 * // [{ id: 'a', name: 'Alice' }, { id: 'b', name: 'Bob' }, { id: 'c', name: 'Charlie' }]
 * ```
 *
 * @public
 */
export function sortById<T extends { id: any }>(a: T, b: T) {
	return a.id > b.id ? 1 : -1
}
