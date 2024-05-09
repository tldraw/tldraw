/**
 * A micro cache used when storing records in memory (using a WeakMap).
 * @public
 */
export class WeakCache<K extends object, V> {
	/** The map of items to their cached values. */
	items = new WeakMap<K, V>()

	/**
	 * Get the cached value for a given record. If the record is not present in the map, the callback
	 * will be used to create the value (with the result being stored in the cache for next time).
	 *
	 * @param item - The item to get.
	 * @param cb - The callback to use to create the value when a cached value is not found.
	 */
	get<P extends K>(item: P, cb: (item: P) => V) {
		if (!this.items.has(item)) {
			this.items.set(item, cb(item))
		}

		return this.items.get(item)!
	}
}
