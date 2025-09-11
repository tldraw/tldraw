/**
 * A lightweight cache implementation using WeakMap for storing key-value pairs.
 *
 * A micro cache that stores computed values associated with object keys.
 * Uses WeakMap internally, which means keys can be garbage collected when no other
 * references exist, and only object keys are supported. Provides lazy computation
 * with memoization.
 *
 * @example
 * ```ts
 * const cache = new WeakCache<User, string>()
 * const user = { id: 1, name: 'Alice' }
 *
 * // Get cached value, computing it if not present
 * const displayName = cache.get(user, (u) => `${u.name} (#${u.id})`)
 * // Returns 'Alice (#1)'
 *
 * // Subsequent calls return cached value
 * const sameName = cache.get(user, (u) => `${u.name} (#${u.id})`)
 * // Returns 'Alice (#1)' without recomputing
 * ```
 * @public
 */
export class WeakCache<K extends object, V> {
	/**
	 * The internal WeakMap storage for cached key-value pairs.
	 *
	 * @public
	 */
	items = new WeakMap<K, V>()

	/**
	 * Get the cached value for a given key, computing it if not already cached.
	 *
	 * Retrieves the cached value associated with the given key. If no cached
	 * value exists, calls the provided callback function to compute the value, stores it
	 * in the cache, and returns it. Subsequent calls with the same key will return the
	 * cached value without recomputation.
	 *
	 * @param item - The object key to retrieve the cached value for
	 * @param cb - Callback function that computes the value when not already cached
	 * @returns The cached value if it exists, otherwise the newly computed value from the callback
	 *
	 * @example
	 * ```ts
	 * const cache = new WeakCache<HTMLElement, DOMRect>()
	 * const element = document.getElementById('my-element')!
	 *
	 * // First call computes and caches the bounding rect
	 * const rect1 = cache.get(element, (el) => el.getBoundingClientRect())
	 *
	 * // Second call returns cached value
	 * const rect2 = cache.get(element, (el) => el.getBoundingClientRect())
	 * // rect1 and rect2 are the same object
	 * ```
	 */
	get<P extends K>(item: P, cb: (item: P) => V) {
		if (!this.items.has(item)) {
			this.items.set(item, cb(item))
		}

		return this.items.get(item)!
	}
}
