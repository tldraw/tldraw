import { WeakCache } from '@tldraw/utils'
import { Editor } from '../Editor'

export class CacheManager {
	constructor(public editor: Editor) {}

	private caches = new Map<string, WeakCache<any, unknown>>()

	createCache<T extends object, Q>(name: string) {
		const cache = new WeakCache<T, Q>()
		this.caches.set(name, cache)
		return cache
	}

	get<T extends object, Q>(name: string): WeakCache<T, Q> {
		return this.caches.get(name) as WeakCache<T, Q>
	}

	clear(name: string) {
		const cache = this.caches.get(name)
		if (!cache) throw Error(`Cache ${name} not found`)
		cache.clear()
	}

	clearAll() {
		this.caches.clear()
	}
}
