/** A micro cache used when storing records in memory (using a WeakMap). */
export class Cache<T extends object, K> {
	/** The map of items to their cached values. */
	items = new WeakMap<T, K>()

	/**
	 * Get the cached value for a given record. If the record is not present in the map, the callback
	 * will be used to create the value (with the result being stored in the cache for next time).
	 *
	 * @param item - The item to get.
	 * @param cb - The callback to use to create the value when a cached value is not found.
	 */
	get<P extends T>(item: P, cb: (item: P) => K) {
		if (!this.items.has(item)) {
			this.items.set(item, cb(item))
		}

		return this.items.get(item)!
	}
}
