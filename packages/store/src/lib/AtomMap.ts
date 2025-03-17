import { atom, Atom, transact, UNINITIALIZED } from '@tldraw/state'
import { assert } from '@tldraw/utils'
import { emptyMap, ImmutableMap } from './ImmutableMap'

/**
 * A drop-in replacement for Map that stores values in atoms and can be used in reactive contexts.
 * @public
 */
export class AtomMap<K, V> implements Map<K, V> {
	private atoms: Atom<ImmutableMap<K, Atom<V | UNINITIALIZED>>>

	constructor(
		private readonly name: string,
		entries?: Iterable<readonly [K, V]>
	) {
		let atoms = emptyMap<K, Atom<V>>()
		if (entries) {
			atoms = atoms.withMutations((atoms) => {
				for (const [k, v] of entries) {
					atoms.set(k, atom(`${name}:${String(k)}`, v))
				}
			})
		}
		this.atoms = atom(`${name}:atoms`, atoms)
	}

	/** @internal */
	getAtom(key: K): Atom<V | UNINITIALIZED> | undefined {
		const valueAtom = this.atoms.__unsafe__getWithoutCapture().get(key)
		if (!valueAtom) {
			// if the value is missing, we want to track whether it's in the present keys set
			this.atoms.get()
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
		const valueAtom = this.atoms.__unsafe__getWithoutCapture().get(key)
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
		const valueAtom = this.atoms.__unsafe__getWithoutCapture().get(key)
		if (!valueAtom) return false
		assert(valueAtom.__unsafe__getWithoutCapture() !== UNINITIALIZED)
		return true
	}

	set(key: K, value: V) {
		const existingAtom = this.atoms.__unsafe__getWithoutCapture().get(key)
		if (existingAtom) {
			existingAtom.set(value)
		} else {
			this.atoms.update((atoms) => {
				return atoms.set(key, atom(`${this.name}:${String(key)}`, value))
			})
		}
		return this
	}

	update(key: K, updater: (value: V) => V) {
		const valueAtom = this.atoms.__unsafe__getWithoutCapture().get(key)
		if (!valueAtom) {
			throw new Error(`AtomMap: key ${key} not found`)
		}
		const value = valueAtom.__unsafe__getWithoutCapture()
		assert(value !== UNINITIALIZED)
		valueAtom.set(updater(value))
	}

	delete(key: K) {
		const valueAtom = this.atoms.__unsafe__getWithoutCapture().get(key)
		if (!valueAtom) {
			return false
		}

		transact(() => {
			valueAtom.set(UNINITIALIZED)
			this.atoms.update((atoms) => {
				return atoms.delete(key)
			})
		})
		return true
	}

	deleteMany(keys: Iterable<K>): [K, V][] {
		return transact(() => {
			const deleted: [K, V][] = []
			const newAtoms = this.atoms.get().withMutations((atoms) => {
				for (const key of keys) {
					const valueAtom = atoms.get(key)
					if (!valueAtom) continue
					const oldValue = valueAtom.get()
					assert(oldValue !== UNINITIALIZED)

					deleted.push([key, oldValue])

					atoms.delete(key)
					valueAtom.set(UNINITIALIZED)
				}
			})

			if (deleted.length) {
				this.atoms.set(newAtoms)
			}

			return deleted
		})
	}

	clear() {
		return transact(() => {
			for (const valueAtom of this.atoms.__unsafe__getWithoutCapture().values()) {
				valueAtom.set(UNINITIALIZED)
			}
			this.atoms.set(emptyMap())
		})
	}

	*entries(): Generator<[K, V], undefined, unknown> {
		for (const [key, valueAtom] of this.atoms.get()) {
			const value = valueAtom.get()
			assert(value !== UNINITIALIZED)
			yield [key, value]
		}
	}

	*keys(): Generator<K, undefined, unknown> {
		for (const key of this.atoms.get().keys()) {
			yield key
		}
	}

	*values(): Generator<V, undefined, unknown> {
		for (const valueAtom of this.atoms.get().values()) {
			const value = valueAtom.get()
			assert(value !== UNINITIALIZED)
			yield value
		}
	}

	// eslint-disable-next-line no-restricted-syntax
	get size() {
		return this.atoms.get().size
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
