import { AtomMap } from './AtomMap'

/**
 * A drop-in replacement for Set that stores values in atoms and can be used in reactive contexts.
 * @public
 */
export class AtomSet<T> {
	private readonly map: AtomMap<T, T>
	constructor(
		private readonly name: string,
		keys?: Iterable<T>
	) {
		const entries = keys ? Array.from(keys, (k) => [k, k] as const) : undefined
		this.map = new AtomMap(name, entries)
	}

	add(value: T): this {
		this.map.set(value, value)
		return this
	}
	clear(): void {
		this.map.clear()
	}
	delete(value: T): boolean {
		return this.map.delete(value)
	}
	forEach(callbackfn: (value: T, value2: T, set: AtomSet<T>) => void, thisArg?: any): void {
		for (const value of this) {
			callbackfn.call(thisArg, value, value, this)
		}
	}
	has(value: T): boolean {
		return this.map.has(value)
	}
	// eslint-disable-next-line no-restricted-syntax
	get size(): number {
		return this.map.size
	}
	entries(): Generator<[T, T], undefined, unknown> {
		return this.map.entries()
	}
	keys(): Generator<T, undefined, unknown> {
		return this.map.keys()
	}
	values(): Generator<T, undefined, unknown> {
		return this.map.keys()
	}
	[Symbol.iterator](): Generator<T, undefined, unknown> {
		return this.map.keys()
	}
	[Symbol.toStringTag]: string = 'AtomSet'
}
