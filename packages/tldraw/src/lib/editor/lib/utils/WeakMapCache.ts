/** @public */
export class WeakMapCache<T extends object, K> {
	items = new WeakMap<T, K>()

	get<P extends T>(item: P, cb: (item: P) => K) {
		if (!this.items.has(item)) {
			this.items.set(item, cb(item))
		}
		return this.items.get(item)!
	}

	access(item: T) {
		return this.items.get(item)
	}

	set(item: T, value: K) {
		this.items.set(item, value)
	}

	has(item: T) {
		return this.items.has(item)
	}

	invalidate(item: T) {
		this.items.delete(item)
	}

	bust() {
		this.items = new WeakMap()
	}
}
