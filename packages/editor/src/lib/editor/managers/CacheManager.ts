import { WeakCache } from '@tldraw/utils'
import { Editor } from '../Editor'

type CacheItem<T extends object, Q> = {
	cache: WeakCache<T, Q>
	fn: (input: T) => Q
}

export class CacheManager {
	constructor(public editor: Editor) {}

	private items = new Map<string, CacheItem<any, any>>()

	createCache<T extends object, Q>(name: string, fn: (input: T) => Q) {
		this.items.set(name, { cache: new WeakCache<T, Q>(), fn })
		return this.get<T, Q>(name)
	}

	has(name: string) {
		return this.items.has(name)
	}

	get<T extends object, Q>(name: string): CacheItem<T, Q> {
		return this.items.get(name)!
	}

	getValue<T extends object, Q>(name: string, input: T): Q {
		const item = this.get<T, Q>(name)
		if (!item) throw Error(`Cache ${name} not found`)
		return item.cache.get(input, item.fn)
	}

	clear(name: string) {
		const item = this.items.get(name)
		if (!item) throw Error(`Cache ${name} not found`)
		item.cache.clear()
	}

	clearAll() {
		this.items.clear()
	}
}
