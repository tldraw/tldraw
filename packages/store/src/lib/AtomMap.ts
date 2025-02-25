import { atom, Atom, transact, UNINITIALIZED } from '@tldraw/state'

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
		if (value === UNINITIALIZED) {
			return undefined
		}
		return value
	}

	__unsafe__getWithoutCapture(key: K): V | undefined {
		const valueAtom = this.valueMap.get(key)
		if (!valueAtom) return undefined
		const value = valueAtom.__unsafe__getWithoutCapture()
		if (value === UNINITIALIZED) return undefined
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
		return valueAtom.__unsafe__getWithoutCapture() !== UNINITIALIZED
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
			if (value === UNINITIALIZED) {
				throw new Error(`AtomMap: key ${key} not found`)
			}
			valueAtom.set(updater(value))
		})
	}

	delete(key: K) {
		return transact(() => {
			const valueAtom = this.valueMap.get(key)
			if (!valueAtom) {
				return false
			}
			valueAtom.set(UNINITIALIZED)
			this.presentKeysAtom.update((keys) => {
				const newKeys = new Set(keys)
				newKeys.delete(key)
				return newKeys
			})
			this.valueMap.delete(key)
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
				if (oldValue === UNINITIALIZED) continue

				deleted.push([key, oldValue])

				valueAtom.set(UNINITIALIZED)
				if (!newPresentKeys) {
					newPresentKeys = new Set(this.presentKeysAtom.__unsafe__getWithoutCapture())
				}
				newPresentKeys.delete(key)
				this.valueMap.delete(key)
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
		for (const key of this.presentKeysAtom.get()) {
			const value = this.getAtom(key)!.get()
			if (value === UNINITIALIZED) {
				continue
			}
			yield [key, value]
		}
	}

	*keys(): Generator<K, undefined, unknown> {
		for (const key of this.presentKeysAtom.get()) {
			const value = this.getAtom(key)!.get()
			if (value === UNINITIALIZED) {
				continue
			}
			yield key
		}
	}

	*values(): Generator<V, undefined, unknown> {
		for (const key of this.presentKeysAtom.get()) {
			const value = this.getAtom(key)!.get()
			if (value === UNINITIALIZED) {
				continue
			}
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
