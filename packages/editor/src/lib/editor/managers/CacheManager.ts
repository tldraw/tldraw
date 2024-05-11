import { WeakCache } from '@tldraw/utils'
import { Editor } from '../Editor'

type CacheItem<T extends object, Q> = {
	cache: WeakCache<T, Q>
	fn: (input: T) => Q
}

export class CacheManager {
	constructor(public editor: Editor) {}

	/**
	 * The manager's cache items.
	 */
	private items = new Map<string, CacheItem<any, any>>()

	/**
	 * Get a cache by name.
	 */
	private get<T extends object, Q>(name: string): CacheItem<T, Q> {
		return this.items.get(name)!
	}

	/**
	 * Get whether a cache exists.
	 */
	has(name: string) {
		return this.items.has(name)
	}

	/**
	 * Create a new cache.
	 *
	 * @param name - The name of the cache.
	 * @param fn - The function to use to create a new cached value for a given input.
	 */
	createCache<T extends object, Q>(name: string, fn: (input: T) => Q) {
		this.items.set(name, { cache: new WeakCache<T, Q>(), fn })
		return this.get<T, Q>(name)
	}

	/**
	 * Get the value from a cache. If the cache does not exist, it will be created using the function provided when the cache was created.
	 *
	 * @param name - The name of the cache.
	 * @param input - The input to the cache function.
	 */
	getValue<T extends object, Q>(name: string, input: T): Q {
		const item = this.get<T, Q>(name)
		if (!item) throw Error(`Cache ${name} not found`)
		return item.cache.get(input, item.fn)
	}

	/**
	 * Clear all values from a cache.
	 *
	 * @param name - The name of the cache.
	 */
	clear(name: string) {
		const item = this.items.get(name)
		if (!item) throw Error(`Cache ${name} not found`)
		item.cache.clear()
	}
}
