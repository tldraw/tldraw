/*!
 * ImmutableSet wrapper built on top of ImmutableMap
 * Implements basic Set operations using ImmutableMap as the underlying storage
 */

import { ImmutableMap } from './ImmutableMap'

const PRESENT = true
const EMPTY_MAP = new ImmutableMap<any, boolean>()

/** @internal */
export class ImmutableSet<T> {
	private _map: ImmutableMap<T, boolean>

	constructor(values?: Iterable<T> | null | undefined) {
		if (values === undefined || values === null) {
			this._map = EMPTY_MAP
		} else if (values instanceof ImmutableSet) {
			this._map = values._map
		} else {
			let map = EMPTY_MAP.asMutable()
			for (const value of values) {
				map = map.set(value, PRESENT)
			}
			this._map = map.asImmutable()
		}
	}

	// eslint-disable-next-line no-restricted-syntax
	get size(): number {
		return this._map.size
	}

	has(value: T): boolean {
		return this._map.get(value) === PRESENT
	}

	add(value: T): ImmutableSet<T> {
		const newMap = this._map.set(value, PRESENT)
		// If the map is mutable (has __ownerID), then set() mutated it in place and returned the same instance
		if (newMap === this._map) {
			return this
		}
		// Otherwise, we need to create a new set with the new map
		return new ImmutableSet<T>().withMap(newMap)
	}

	delete(value: T): ImmutableSet<T> {
		if (!this.has(value)) {
			return this
		}
		const newMap = this._map.delete(value)
		// If the map is mutable (has __ownerID), then delete() mutated it in place and returned the same instance
		if (newMap === this._map) {
			return this
		}
		// Otherwise, we need to create a new set with the new map
		return new ImmutableSet<T>().withMap(newMap)
	}

	clear(): ImmutableSet<T> {
		if (this.size === 0) {
			return this
		}
		return new ImmutableSet<T>()
	}

	values(): Iterable<T> {
		return this._map.keys()
	}

	keys(): Iterable<T> {
		return this.values()
	}

	entries(): Iterable<[T, T]> {
		return Array.from(this.values()).map((value) => [value, value] as [T, T])
	}

	[Symbol.iterator](): Iterator<T> {
		return this.values()[Symbol.iterator]()
	}

	forEach(callbackfn: (value: T, value2: T, set: ImmutableSet<T>) => void, thisArg?: any): void {
		for (const value of this.values()) {
			callbackfn.call(thisArg, value, value, this)
		}
	}

	withMutations(fn: (mutable: ImmutableSet<T>) => void): ImmutableSet<T> {
		const mutable = this.asMutable()
		fn(mutable)
		return mutable.wasAltered() ? mutable.asImmutable() : this
	}

	asMutable(): ImmutableSet<T> {
		const mutableSet = new ImmutableSet<T>()
		mutableSet._map = this._map.asMutable()
		return mutableSet
	}

	asImmutable(): ImmutableSet<T> {
		// Following Immutable.js semantics: convert this instance to immutable
		// by calling asImmutable on the underlying map, which sets __ownerID = null
		const map = this._map.asImmutable()
		if (map === this._map) {
			return this
		}
		return new ImmutableSet<T>().withMap(map)
	}

	wasAltered(): boolean {
		return this._map.wasAltered()
	}

	intersect(other: ImmutableSet<T>): ImmutableSet<T> {
		const result = new ImmutableSet<T>().asMutable()
		for (const value of this) {
			if (other.has(value)) {
				result.add(value)
			}
		}
		return result.asImmutable()
	}

	static intersectMany<T>(sets: ImmutableSet<T>[]): ImmutableSet<T> {
		if (sets.length === 0) return new ImmutableSet<T>()
		if (sets.length === 1) return sets[0]
		const result = new ImmutableSet<T>().asMutable()
		outer: for (const item of sets[0]) {
			for (let i = 1; i < sets.length; i++) {
				if (!sets[i].has(item)) {
					continue outer
				}
			}
			result.add(item)
		}
		return result.asImmutable()
	}

	private withMap(map: ImmutableMap<T, boolean>): ImmutableSet<T> {
		const newSet = new ImmutableSet<T>()
		newSet._map = map
		return newSet
	}

	equals(other: ImmutableSet<T>): boolean {
		if (this.size !== other.size) return false
		for (const v of this) {
			if (!other.has(v)) return false
		}
		return true
	}
}
