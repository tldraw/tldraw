import { atom, Atom, transact, UNINITIALIZED } from '@tldraw/state'
import { assert } from '@tldraw/utils'

/**
 * A drop-in replacement for Map that stores values in atoms and can be used in reactive contexts.
 * @public
 */
export class AtomMap<K, V> implements Map<K, V> {
	private valueMap: Map<K, Atom<V | UNINITIALIZED>>
	private presentKeysAtom: Atom<ReadonlySet<K>>

	constructor(
		private readonly name: string,
		entries?: Iterable<[K, V]>
	) {
		const presentKeys = new Set<K>()
		const valueMap = new Map<K, Atom<V>>()
		if (entries) {
			for (const [k, v] of entries) {
				presentKeys.add(k)
				valueMap.set(k, atom(`${name}:${String(k)}`, v))
			}
		}
		this.valueMap = valueMap
		this.presentKeysAtom = atom(`${name}:presentKeys`, presentKeys)
	}

	/** @internal */
	getAtom(key: K): Atom<V | UNINITIALIZED> | undefined {
		const valueAtom = this.valueMap.get(key)
		if (!valueAtom) {
			// if the value is missing, we want to track whether it's in the present keys set
			this.presentKeysAtom.get()
			return undefined
		}
		return valueAtom
	}

	get(key: K): V | undefined {
		const value = this.getAtom(key)?.get()
		assert(value !== UNINITIALIZED)
		return value
	}

	__unsafe__getWithoutCapture(key: K): V | undefined {
		const valueAtom = this.valueMap.get(key)
		if (!valueAtom) return undefined
		const value = valueAtom.__unsafe__getWithoutCapture()
		assert(value !== UNINITIALIZED)
		return value
	}

	has(key: K): boolean {
		const valueAtom = this.getAtom(key)
		if (!valueAtom) {
			return false
		}
		return valueAtom.get() !== UNINITIALIZED
	}

	__unsafe__hasWithoutCapture(key: K): boolean {
		const valueAtom = this.valueMap.get(key)
		if (!valueAtom) return false
		assert(valueAtom.__unsafe__getWithoutCapture() !== UNINITIALIZED)
		return true
	}

	set(key: K, value: V) {
		transact(() => {
			const existingAtom = this.valueMap.get(key)
			if (existingAtom) {
				existingAtom.set(value)
			} else {
				this.valueMap.set(key, atom(`${this.name}:${String(key)}`, value))
				this.presentKeysAtom.update((keys) => {
					const newKeys = new Set(keys)
					newKeys.add(key)
					return newKeys
				})
			}
		})
		return this
	}

	update(key: K, updater: (value: V) => V) {
		return transact(() => {
			const valueAtom = this.valueMap.get(key)
			if (!valueAtom) {
				throw new Error(`AtomMap: key ${key} not found`)
			}
			const value = valueAtom.__unsafe__getWithoutCapture()
			assert(value !== UNINITIALIZED)
			valueAtom.set(updater(value))
		})
	}

	delete(key: K) {
		return transact(() => {
			const valueAtom = this.valueMap.get(key)
			if (!valueAtom) {
				return false
			}
			this.valueMap.delete(key)
			valueAtom.set(UNINITIALIZED)
			this.presentKeysAtom.update((keys) => {
				const newKeys = new Set(keys)
				newKeys.delete(key)
				return newKeys
			})
			return true
		})
	}

	deleteMany(keys: Iterable<K>): [K, V][] {
		return transact(() => {
			let newPresentKeys
			const deleted: [K, V][] = []

			for (const key of keys) {
				const valueAtom = this.valueMap.get(key)
				if (!valueAtom) continue
				const oldValue = valueAtom.get()
				assert(oldValue !== UNINITIALIZED)

				deleted.push([key, oldValue])

				this.valueMap.delete(key)
				valueAtom.set(UNINITIALIZED)
				if (!newPresentKeys) {
					newPresentKeys = new Set(this.presentKeysAtom.__unsafe__getWithoutCapture())
				}
				newPresentKeys.delete(key)
			}

			if (newPresentKeys) {
				this.presentKeysAtom.set(newPresentKeys)
			}

			return deleted
		})
	}

	clear() {
		return transact(() => {
			for (const valueAtom of this.valueMap.values()) {
				valueAtom.set(UNINITIALIZED)
			}
			this.presentKeysAtom.set(new Set())
			this.valueMap.clear()
		})
	}

	*entries(): Generator<[K, V], undefined, unknown> {
		// dereference the presentKeysAtom to make sure we track insertions
		this.presentKeysAtom.get()
		// then iterate over the valueMap so we get values inserted during iteration
		for (const [key, valueAtom] of this.valueMap.entries()) {
			const value = valueAtom.get()
			assert(value !== UNINITIALIZED)
			yield [key, value]
		}
	}

	*keys(): Generator<K, undefined, unknown> {
		// dereference the presentKeysAtom to make sure we track insertions
		this.presentKeysAtom.get()
		// then iterate over the valueMap so we get keys inserted during iteration
		for (const key of this.valueMap.keys()) {
			yield key
		}
	}

	*values(): Generator<V, undefined, unknown> {
		// dereference the presentKeysAtom to make sure we track insertions
		this.presentKeysAtom.get()
		// then iterate over the valueMap so we get values inserted during iteration
		for (const valueAtom of this.valueMap.values()) {
			const value = valueAtom.get()
			assert(value !== UNINITIALIZED)
			yield value
		}
	}

	// eslint-disable-next-line no-restricted-syntax
	get size() {
		return this.presentKeysAtom.get().size
	}

	forEach(callbackfn: (value: V, key: K, map: AtomMap<K, V>) => void, thisArg?: any): void {
		for (const [key, value] of this.entries()) {
			callbackfn.call(thisArg, value, key, this)
		}
	}

	[Symbol.iterator]() {
		return this.entries()
	}

	[Symbol.toStringTag] = 'AtomMap'
}
