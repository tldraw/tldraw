/** Simple LRU cache backed by a Map's insertion-order iteration. @public */
export class LruCache<K, V> {
	private map = new Map<K, V>()
	constructor(private maxSize: number) {}

	get(key: K): V | undefined {
		const value = this.map.get(key)
		if (value !== undefined) {
			// Move to most-recent position
			this.map.delete(key)
			this.map.set(key, value)
		}
		return value
	}

	set(key: K, value: V): void {
		if (this.map.has(key)) this.map.delete(key)
		this.map.set(key, value)
		if (this.map.size > this.maxSize) {
			// Evict oldest entry
			this.map.delete(this.map.keys().next().value!)
		}
	}

	has(key: K): boolean {
		return this.map.has(key)
	}

	get size(): number {
		return this.map.size
	}
}
