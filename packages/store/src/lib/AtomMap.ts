import { atom, Atom, transact, UNINITIALIZED } from '@tldraw/state'
import { assert } from '@tldraw/utils'
import { emptyMap, ImmutableMap } from './ImmutableMap'

/**
 * A drop-in replacement for Map that stores values in atoms and can be used in reactive contexts.
 * @public
 */
export class AtomMap<K, V> implements Map<K, V> {
	private atoms: Atom<ImmutableMap<K, Atom<V | UNINITIALIZED>>>

	/**
	 * Creates a new AtomMap instance.
	 *
	 * name - A unique name for this map, used for atom identification
	 * entries - Optional initial entries to populate the map with
	 * @example
	 * ```ts
	 * // Create an empty map
	 * const map = new AtomMap('userMap')
	 *
	 * // Create a map with initial data
	 * const initialData: [string, number][] = [['a', 1], ['b', 2]]
	 * const mapWithData = new AtomMap('numbersMap', initialData)
	 * ```
	 */
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

	/**
	 * Retrieves the underlying atom for a given key.
	 *
	 * @param key - The key to retrieve the atom for
	 * @returns The atom containing the value, or undefined if the key doesn't exist
	 * @internal
	 */
	getAtom(key: K): Atom<V | UNINITIALIZED> | undefined {
		const valueAtom = this.atoms.__unsafe__getWithoutCapture().get(key)
		if (!valueAtom) {
			// if the value is missing, we want to track whether it's in the present keys set
			this.atoms.get()
			return undefined
		}
		return valueAtom
	}

	/**
	 * Gets the value associated with a key. Returns undefined if the key doesn't exist.
	 * This method is reactive and will cause reactive contexts to update when the value changes.
	 *
	 * @param key - The key to retrieve the value for
	 * @returns The value associated with the key, or undefined if not found
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('name', 'Alice')
	 * console.log(map.get('name')) // 'Alice'
	 * console.log(map.get('missing')) // undefined
	 * ```
	 */
	get(key: K): V | undefined {
		const value = this.getAtom(key)?.get()
		assert(value !== UNINITIALIZED)
		return value
	}

	/**
	 * Gets the value associated with a key without creating reactive dependencies.
	 * This method will not cause reactive contexts to update when the value changes.
	 *
	 * @param key - The key to retrieve the value for
	 * @returns The value associated with the key, or undefined if not found
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('count', 42)
	 * const value = map.__unsafe__getWithoutCapture('count') // No reactive subscription
	 * ```
	 */
	__unsafe__getWithoutCapture(key: K): V | undefined {
		const valueAtom = this.atoms.__unsafe__getWithoutCapture().get(key)
		if (!valueAtom) return undefined
		const value = valueAtom.__unsafe__getWithoutCapture()
		assert(value !== UNINITIALIZED)
		return value
	}

	/**
	 * Checks whether a key exists in the map.
	 * This method is reactive and will cause reactive contexts to update when keys are added or removed.
	 *
	 * @param key - The key to check for
	 * @returns True if the key exists in the map, false otherwise
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * console.log(map.has('name')) // false
	 * map.set('name', 'Alice')
	 * console.log(map.has('name')) // true
	 * ```
	 */
	has(key: K): boolean {
		const valueAtom = this.getAtom(key)
		if (!valueAtom) {
			return false
		}
		return valueAtom.get() !== UNINITIALIZED
	}

	/**
	 * Checks whether a key exists in the map without creating reactive dependencies.
	 * This method will not cause reactive contexts to update when keys are added or removed.
	 *
	 * @param key - The key to check for
	 * @returns True if the key exists in the map, false otherwise
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('active', true)
	 * const exists = map.__unsafe__hasWithoutCapture('active') // No reactive subscription
	 * ```
	 */
	__unsafe__hasWithoutCapture(key: K): boolean {
		const valueAtom = this.atoms.__unsafe__getWithoutCapture().get(key)
		if (!valueAtom) return false
		assert(valueAtom.__unsafe__getWithoutCapture() !== UNINITIALIZED)
		return true
	}

	/**
	 * Sets a value for the given key. If the key already exists, its value is updated.
	 * If the key doesn't exist, a new entry is created.
	 *
	 * @param key - The key to set the value for
	 * @param value - The value to associate with the key
	 * @returns This AtomMap instance for method chaining
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('name', 'Alice').set('age', 30)
	 * ```
	 */
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

	/**
	 * Updates an existing value using an updater function.
	 *
	 * @param key - The key of the value to update
	 * @param updater - A function that receives the current value and returns the new value
	 * @throws Error if the key doesn't exist in the map
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('count', 5)
	 * map.update('count', count => count + 1) // count is now 6
	 * ```
	 */
	update(key: K, updater: (value: V) => V) {
		const valueAtom = this.atoms.__unsafe__getWithoutCapture().get(key)
		if (!valueAtom) {
			throw new Error(`AtomMap: key ${key} not found`)
		}
		const value = valueAtom.__unsafe__getWithoutCapture()
		assert(value !== UNINITIALIZED)
		valueAtom.set(updater(value))
	}

	/**
	 * Removes a key-value pair from the map.
	 *
	 * @param key - The key to remove
	 * @returns True if the key existed and was removed, false if it didn't exist
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('temp', 'value')
	 * console.log(map.delete('temp')) // true
	 * console.log(map.delete('missing')) // false
	 * ```
	 */
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

	/**
	 * Removes multiple key-value pairs from the map in a single transaction.
	 *
	 * @param keys - An iterable of keys to remove
	 * @returns An array of [key, value] pairs that were actually deleted
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('a', 1).set('b', 2).set('c', 3)
	 * const deleted = map.deleteMany(['a', 'c', 'missing'])
	 * console.log(deleted) // [['a', 1], ['c', 3]]
	 * ```
	 */
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

	/**
	 * Removes all key-value pairs from the map.
	 *
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('a', 1).set('b', 2)
	 * map.clear()
	 * console.log(map.size) // 0
	 * ```
	 */
	clear() {
		return transact(() => {
			for (const valueAtom of this.atoms.__unsafe__getWithoutCapture().values()) {
				valueAtom.set(UNINITIALIZED)
			}
			this.atoms.set(emptyMap())
		})
	}

	/**
	 * Returns an iterator that yields [key, value] pairs for each entry in the map.
	 * This method is reactive and will cause reactive contexts to update when entries change.
	 *
	 * @returns A generator that yields [key, value] tuples
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('a', 1).set('b', 2)
	 * for (const [key, value] of map.entries()) {
	 *   console.log(`${key}: ${value}`)
	 * }
	 * ```
	 */
	*entries(): Generator<[K, V], undefined, unknown> {
		for (const [key, valueAtom] of this.atoms.get()) {
			const value = valueAtom.get()
			assert(value !== UNINITIALIZED)
			yield [key, value]
		}
	}

	/**
	 * Returns an iterator that yields all keys in the map.
	 * This method is reactive and will cause reactive contexts to update when keys change.
	 *
	 * @returns A generator that yields keys
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('name', 'Alice').set('age', 30)
	 * for (const key of map.keys()) {
	 *   console.log(key) // 'name', 'age'
	 * }
	 * ```
	 */
	*keys(): Generator<K, undefined, unknown> {
		for (const key of this.atoms.get().keys()) {
			yield key
		}
	}

	/**
	 * Returns an iterator that yields all values in the map.
	 * This method is reactive and will cause reactive contexts to update when values change.
	 *
	 * @returns A generator that yields values
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('name', 'Alice').set('age', 30)
	 * for (const value of map.values()) {
	 *   console.log(value) // 'Alice', 30
	 * }
	 * ```
	 */
	*values(): Generator<V, undefined, unknown> {
		for (const valueAtom of this.atoms.get().values()) {
			const value = valueAtom.get()
			assert(value !== UNINITIALIZED)
			yield value
		}
	}

	/**
	 * The number of key-value pairs in the map.
	 * This property is reactive and will cause reactive contexts to update when the size changes.
	 *
	 * @returns The number of entries in the map
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * console.log(map.size) // 0
	 * map.set('a', 1)
	 * console.log(map.size) // 1
	 * ```
	 */
	// eslint-disable-next-line no-restricted-syntax
	get size() {
		return this.atoms.get().size
	}

	/**
	 * Executes a provided function once for each key-value pair in the map.
	 * This method is reactive and will cause reactive contexts to update when entries change.
	 *
	 * @param callbackfn - Function to execute for each entry
	 *   - value - The value of the current entry
	 *   - key - The key of the current entry
	 *   - map - The AtomMap being traversed
	 * @param thisArg - Value to use as `this` when executing the callback
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('a', 1).set('b', 2)
	 * map.forEach((value, key) => {
	 *   console.log(`${key} = ${value}`)
	 * })
	 * ```
	 */
	forEach(callbackfn: (value: V, key: K, map: AtomMap<K, V>) => void, thisArg?: any): void {
		for (const [key, value] of this.entries()) {
			callbackfn.call(thisArg, value, key, this)
		}
	}

	/**
	 * Returns the default iterator for the map, which is the same as entries().
	 * This allows the map to be used in for...of loops and other iterable contexts.
	 *
	 * @returns The same iterator as entries()
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * map.set('a', 1).set('b', 2)
	 *
	 * // These are equivalent:
	 * for (const [key, value] of map) {
	 *   console.log(`${key}: ${value}`)
	 * }
	 *
	 * for (const [key, value] of map.entries()) {
	 *   console.log(`${key}: ${value}`)
	 * }
	 * ```
	 */
	[Symbol.iterator]() {
		return this.entries()
	}

	/**
	 * The string tag used by Object.prototype.toString for this class.
	 *
	 * @example
	 * ```ts
	 * const map = new AtomMap('myMap')
	 * console.log(Object.prototype.toString.call(map)) // '[object AtomMap]'
	 * ```
	 */
	[Symbol.toStringTag] = 'AtomMap'
}
