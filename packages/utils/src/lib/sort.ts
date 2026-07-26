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

/**
 * Compares two records by their `createdAt` timestamp for use with Array.sort(), oldest first,
 * breaking ties on `id`.
 *
 * The tie-break is what makes this worth reaching for over a bare `a.createdAt - b.createdAt`.
 * Timestamps are usually millisecond wall-clock from whichever client created the record, so
 * collisions are reachable — a batch created in one tick, a seeded or imported set, a skewed
 * clock. `Array.prototype.sort` is stable, so a comparator that returns 0 for a tie leaves those
 * records in whatever order the input array happened to be in; for records read out of a store
 * that's insertion order into the query index, which differs between peers and changes when a
 * record is removed and re-added. Falling back to `id` gives every peer the same total order.
 *
 * The order within a tie is arbitrary (ids are not time-ordered) — the point is that it's the
 * same everywhere. For newest-first, swap the arguments: `(a, b) => sortByCreatedAt(b, a)`.
 *
 * @param a - First record to compare
 * @param b - Second record to compare
 * @returns A negative number if a sorts first, a positive number if b does, 0 only when both
 * `createdAt` and `id` match
 *
 * @example
 * ```ts
 * const messages = [
 *   { id: 'b', createdAt: 100 },
 *   { id: 'c', createdAt: 50 },
 *   { id: 'a', createdAt: 100 },
 * ]
 *
 * const sorted = messages.sort(sortByCreatedAt)
 * // [{ id: 'c', createdAt: 50 }, { id: 'a', createdAt: 100 }, { id: 'b', createdAt: 100 }]
 * ```
 *
 * @public
 */
export function sortByCreatedAt<T extends { createdAt: number; id: any }>(a: T, b: T) {
	if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
	if (a.id === b.id) return 0
	return a.id > b.id ? 1 : -1
}
