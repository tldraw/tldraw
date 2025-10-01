/*!
 * This file was lovingly and delicately extracted from Immutable.js
 * MIT License: https://github.com/immutable-js/immutable-js/blob/main/LICENSE
 * Copyright (c) 2014-present, Lee Byron and other contributors.
 */

function smi(i32: number) {
	return ((i32 >>> 1) & 0x40000000) | (i32 & 0xbfffffff)
}

const defaultValueOf = Object.prototype.valueOf

function hash(o: any) {
	if (o == null) {
		return hashNullish(o)
	}

	if (typeof o.hashCode === 'function') {
		// Drop any high bits from accidentally long hash codes.
		return smi(o.hashCode(o))
	}

	const v = valueOf(o)

	if (v == null) {
		return hashNullish(v)
	}

	switch (typeof v) {
		case 'boolean':
			// The hash values for built-in constants are a 1 value for each 5-byte
			// shift region expect for the first, which encodes the value. This
			// reduces the odds of a hash collision for these common values.
			return v ? 0x42108421 : 0x42108420
		case 'number':
			return hashNumber(v)
		case 'string':
			return v.length > STRING_HASH_CACHE_MIN_STRLEN ? cachedHashString(v) : hashString(v)
		case 'object':
		case 'function':
			return hashJSObj(v)
		case 'symbol':
			return hashSymbol(v)
		default:
			if (typeof v.toString === 'function') {
				return hashString(v.toString())
			}
			throw new Error('Value type ' + typeof v + ' cannot be hashed.')
	}
}

function hashNullish(nullish: null | undefined) {
	return nullish === null ? 0x42108422 : /* undefined */ 0x42108423
}

// Compress arbitrarily large numbers into smi hashes.
function hashNumber(n: number) {
	if (n !== n || n === Infinity) {
		return 0
	}
	let hash = n | 0
	if (hash !== n) {
		hash ^= n * 0xffffffff
	}
	while (n > 0xffffffff) {
		n /= 0xffffffff
		hash ^= n
	}
	return smi(hash)
}

function cachedHashString(string: string) {
	let hashed = stringHashCache[string]
	if (hashed === undefined) {
		hashed = hashString(string)
		if (STRING_HASH_CACHE_SIZE === STRING_HASH_CACHE_MAX_SIZE) {
			STRING_HASH_CACHE_SIZE = 0
			stringHashCache = {}
		}
		STRING_HASH_CACHE_SIZE++
		stringHashCache[string] = hashed
	}
	return hashed
}

// http://jsperf.com/hashing-strings
function hashString(string: string) {
	// This is the hash from JVM
	// The hash code for a string is computed as
	// s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
	// where s[i] is the ith character of the string and n is the length of
	// the string. We "mod" the result to make it between 0 (inclusive) and 2^31
	// (exclusive) by dropping high bits.
	let hashed = 0
	for (let ii = 0; ii < string.length; ii++) {
		hashed = (31 * hashed + string.charCodeAt(ii)) | 0
	}
	return smi(hashed)
}

function hashSymbol(sym: symbol) {
	let hashed = symbolMap[sym]
	if (hashed !== undefined) {
		return hashed
	}

	hashed = nextHash()

	symbolMap[sym] = hashed

	return hashed
}

function hashJSObj(obj: object) {
	let hashed = weakMap.get(obj)
	if (hashed !== undefined) {
		return hashed
	}

	hashed = nextHash()

	weakMap.set(obj, hashed)

	return hashed
}

function valueOf(obj: any) {
	return obj.valueOf !== defaultValueOf && typeof obj.valueOf === 'function'
		? obj.valueOf(obj)
		: obj
}

function nextHash() {
	const nextHash = ++_objHashUID
	if (_objHashUID & 0x40000000) {
		_objHashUID = 0
	}
	return nextHash
}

// If possible, use a WeakMap.
const weakMap = new WeakMap()

const symbolMap = Object.create(null)

let _objHashUID = 0

const STRING_HASH_CACHE_MIN_STRLEN = 16
const STRING_HASH_CACHE_MAX_SIZE = 255
let STRING_HASH_CACHE_SIZE = 0
let stringHashCache: Record<string, number> = {}

// Constants describing the size of trie nodes.
const SHIFT = 5 // Resulted in best performance after ______?
const SIZE = 1 << SHIFT
const MASK = SIZE - 1

// A consistent shared value representing "not set" which equals nothing other
// than itself, and nothing that could be provided externally.
const NOT_SET = {}

interface Ref {
	value: boolean
}

// Boolean references, Rough equivalent of `bool &`.
function MakeRef(): Ref {
	return { value: false }
}

function SetRef(ref?: Ref): void {
	if (ref) {
		ref.value = true
	}
}

// http://jsperf.com/copy-array-inline
function arrCopy<I>(arr: Array<I>, offset?: number): Array<I> {
	offset = offset || 0
	const len = Math.max(0, arr.length - offset)
	const newArr: Array<I> = new Array(len)
	for (let ii = 0; ii < len; ii++) {
		// We may want to guard for undefined values with `if (arr[ii + offset] !== undefined`, but ths should not happen by design
		newArr[ii] = arr[ii + offset]
	}
	return newArr
}

const is = Object.is

class OwnerID {}

/**
 * A persistent immutable map implementation based on a Hash Array Mapped Trie (HAMT) data structure.
 * Provides efficient operations for creating, reading, updating, and deleting key-value pairs while
 * maintaining structural sharing to minimize memory usage and maximize performance.
 *
 * This implementation is extracted and adapted from Immutable.js, optimized for tldraw's store needs.
 * All operations return new instances rather than modifying existing ones, ensuring immutability.
 *
 * @public
 * @example
 * ```ts
 * // Create a new map
 * const map = new ImmutableMap([
 *   ['key1', 'value1'],
 *   ['key2', 'value2']
 * ])
 *
 * // Add or update values
 * const updated = map.set('key3', 'value3')
 *
 * // Get values
 * const value = map.get('key1') // 'value1'
 *
 * // Delete values
 * const smaller = map.delete('key1')
 * ```
 */
export class ImmutableMap<K, V> {
	// @pragma Construction
	// @ts-ignore
	_root: MapNode<K, V>
	// @ts-ignore
	size: number
	// @ts-ignore
	__ownerID: OwnerID
	// @ts-ignore
	__hash: number | undefined
	// @ts-ignore
	__altered: boolean

	/**
	 * Creates a new ImmutableMap instance.
	 *
	 * @param value - An iterable of key-value pairs to populate the map, or null/undefined for an empty map
	 * @example
	 * ```ts
	 * // Create from array of pairs
	 * const map1 = new ImmutableMap([['a', 1], ['b', 2]])
	 *
	 * // Create empty map
	 * const map2 = new ImmutableMap()
	 *
	 * // Create from another map
	 * const map3 = new ImmutableMap(map1)
	 * ```
	 */
	constructor(value?: Iterable<[K, V]> | null | undefined) {
		// @ts-ignore
		return value === undefined || value === null
			? emptyMap()
			: value instanceof ImmutableMap
				? value
				: emptyMap().withMutations((map) => {
						for (const [k, v] of value) {
							map.set(k, v)
						}
					})
	}

	/**
	 * Gets the value associated with the specified key.
	 *
	 * @param k - The key to look up
	 * @returns The value associated with the key, or undefined if not found
	 * @example
	 * ```ts
	 * const map = new ImmutableMap([['key1', 'value1']])
	 * console.log(map.get('key1')) // 'value1'
	 * console.log(map.get('missing')) // undefined
	 * ```
	 */
	get(k: K): V | undefined
	/**
	 * Gets the value associated with the specified key, with a fallback value.
	 *
	 * @param k - The key to look up
	 * @param notSetValue - The value to return if the key is not found
	 * @returns The value associated with the key, or the fallback value if not found
	 * @example
	 * ```ts
	 * const map = new ImmutableMap([['key1', 'value1']])
	 * console.log(map.get('key1', 'default')) // 'value1'
	 * console.log(map.get('missing', 'default')) // 'default'
	 * ```
	 */
	get(k: K, notSetValue?: V): V {
		return this._root ? this._root.get(0, undefined as any, k, notSetValue)! : notSetValue!
	}

	/**
	 * Returns a new ImmutableMap with the specified key-value pair added or updated.
	 * If the key already exists, its value is replaced. Otherwise, a new entry is created.
	 *
	 * @param k - The key to set
	 * @param v - The value to associate with the key
	 * @returns A new ImmutableMap with the key-value pair set
	 * @example
	 * ```ts
	 * const map = new ImmutableMap([['a', 1]])
	 * const updated = map.set('b', 2) // New map with both 'a' and 'b'
	 * const replaced = map.set('a', 10) // New map with 'a' updated to 10
	 * ```
	 */
	set(k: K, v: V) {
		return updateMap(this, k, v)
	}

	/**
	 * Returns a new ImmutableMap with the specified key removed.
	 * If the key doesn't exist, returns the same map instance.
	 *
	 * @param k - The key to remove
	 * @returns A new ImmutableMap with the key removed, or the same instance if key not found
	 * @example
	 * ```ts
	 * const map = new ImmutableMap([['a', 1], ['b', 2]])
	 * const smaller = map.delete('a') // New map with only 'b'
	 * const same = map.delete('missing') // Returns original map
	 * ```
	 */
	delete(k: K) {
		return updateMap(this, k, NOT_SET as any)
	}

	/**
	 * Returns a new ImmutableMap with all specified keys removed.
	 * This is more efficient than calling delete() multiple times.
	 *
	 * @param keys - An iterable of keys to remove
	 * @returns A new ImmutableMap with all specified keys removed
	 * @example
	 * ```ts
	 * const map = new ImmutableMap([['a', 1], ['b', 2], ['c', 3]])
	 * const smaller = map.deleteAll(['a', 'c']) // New map with only 'b'
	 * ```
	 */
	deleteAll(keys: Iterable<K>) {
		return this.withMutations((map) => {
			for (const key of keys) {
				map.delete(key)
			}
		})
	}

	__ensureOwner(ownerID: OwnerID) {
		if (ownerID === this.__ownerID) {
			return this
		}
		if (!ownerID) {
			if (this.size === 0) {
				return emptyMap()
			}
			this.__ownerID = ownerID
			this.__altered = false
			return this
		}
		return makeMap(this.size, this._root, ownerID, this.__hash)
	}

	/**
	 * Applies multiple mutations efficiently by creating a mutable copy,
	 * applying all changes, then returning an immutable result.
	 * This is more efficient than chaining multiple set/delete operations.
	 *
	 * @param fn - Function that receives a mutable copy and applies changes
	 * @returns A new ImmutableMap with all mutations applied, or the same instance if no changes
	 * @example
	 * ```ts
	 * const map = new ImmutableMap([['a', 1]])
	 * const updated = map.withMutations(mutable => {
	 *   mutable.set('b', 2)
	 *   mutable.set('c', 3)
	 *   mutable.delete('a')
	 * }) // Efficiently applies all changes at once
	 * ```
	 */
	withMutations(fn: (mutable: this) => void): this {
		const mutable = this.asMutable()
		fn(mutable)
		return mutable.wasAltered() ? mutable.__ensureOwner(this.__ownerID) : this
	}

	/**
	 * Checks if this map instance has been altered during a mutation operation.
	 * This is used internally to optimize mutations.
	 *
	 * @returns True if the map was altered, false otherwise
	 * @internal
	 */
	wasAltered() {
		return this.__altered
	}

	/**
	 * Returns a mutable copy of this map that can be efficiently modified.
	 * Multiple changes to the mutable copy are batched together.
	 *
	 * @returns A mutable copy of this map
	 * @internal
	 */
	asMutable() {
		return this.__ownerID ? this : this.__ensureOwner(new OwnerID())
	}

	/**
	 * Makes the map iterable, yielding key-value pairs.
	 *
	 * @returns An iterator over [key, value] pairs
	 * @example
	 * ```ts
	 * const map = new ImmutableMap([['a', 1], ['b', 2]])
	 * for (const [key, value] of map) {
	 *   console.log(key, value) // 'a' 1, then 'b' 2
	 * }
	 * ```
	 */
	[Symbol.iterator](): Iterator<[K, V]> {
		return this.entries()[Symbol.iterator]()
	}

	/**
	 * Returns an iterable of key-value pairs.
	 *
	 * @returns An iterable over [key, value] pairs
	 * @example
	 * ```ts
	 * const map = new ImmutableMap([['a', 1], ['b', 2]])
	 * const entries = Array.from(map.entries()) // [['a', 1], ['b', 2]]
	 * ```
	 */
	entries(): Iterable<[K, V]> {
		return new MapIterator(this, ITERATE_ENTRIES, false)
	}

	/**
	 * Returns an iterable of keys.
	 *
	 * @returns An iterable over keys
	 * @example
	 * ```ts
	 * const map = new ImmutableMap([['a', 1], ['b', 2]])
	 * const keys = Array.from(map.keys()) // ['a', 'b']
	 * ```
	 */
	keys(): Iterable<K> {
		return new MapIterator(this, ITERATE_KEYS, false)
	}

	/**
	 * Returns an iterable of values.
	 *
	 * @returns An iterable over values
	 * @example
	 * ```ts
	 * const map = new ImmutableMap([['a', 1], ['b', 2]])
	 * const values = Array.from(map.values()) // [1, 2]
	 * ```
	 */
	values(): Iterable<V> {
		return new MapIterator(this, ITERATE_VALUES, false)
	}
}

type MapNode<K, V> =
	| ArrayMapNode<K, V>
	| BitmapIndexedNode<K, V>
	| HashArrayMapNode<K, V>
	| HashCollisionNode<K, V>
	| ValueNode<K, V>

// #pragma Trie Nodes

class ArrayMapNode<K, V> {
	constructor(
		public ownerID: OwnerID,
		public entries: Array<[K, V]>
	) {}

	get(_shift: unknown, _keyHash: unknown, key: K, notSetValue?: V) {
		const entries = this.entries
		for (let ii = 0, len = entries.length; ii < len; ii++) {
			if (is(key, entries[ii][0])) {
				return entries[ii][1]
			}
		}
		return notSetValue
	}

	update(
		ownerID: OwnerID,
		_shift: unknown,
		_keyHash: unknown,
		key: K,
		value: V,
		didChangeSize?: Ref,
		didAlter?: Ref
	): MapNode<K, V> | undefined {
		const removed = value === NOT_SET

		const entries = this.entries
		let idx = 0
		const len = entries.length
		for (; idx < len; idx++) {
			if (is(key, entries[idx][0])) {
				break
			}
		}
		const exists = idx < len

		if (exists ? entries[idx][1] === value : removed) {
			return this
		}

		SetRef(didAlter)
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
		;(removed || !exists) && SetRef(didChangeSize)

		if (removed && entries.length === 1) {
			return // undefined
		}

		if (!exists && !removed && entries.length >= MAX_ARRAY_MAP_SIZE) {
			return createNodes(ownerID, entries, key, value)
		}

		const isEditable = ownerID && ownerID === this.ownerID
		const newEntries = isEditable ? entries : arrCopy(entries)

		if (exists) {
			if (removed) {
				// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
				idx === len - 1 ? newEntries.pop() : (newEntries[idx] = newEntries.pop()!)
			} else {
				newEntries[idx] = [key, value]
			}
		} else {
			newEntries.push([key, value])
		}

		if (isEditable) {
			this.entries = newEntries
			return this
		}

		return new ArrayMapNode(ownerID, newEntries)
	}
}

class BitmapIndexedNode<K, V> {
	constructor(
		public ownerID: OwnerID,
		public bitmap: number,
		public nodes: Array<MapNode<K, V>>
	) {}

	get(shift: number, keyHash: number, key: K, notSetValue?: V): V | undefined {
		if (keyHash === undefined) {
			keyHash = hash(key)
		}
		const bit = 1 << ((shift === 0 ? keyHash : keyHash >>> shift) & MASK)
		const bitmap = this.bitmap
		return (bitmap & bit) === 0
			? notSetValue
			: this.nodes[popCount(bitmap & (bit - 1))].get(shift + SHIFT, keyHash, key, notSetValue)
	}

	update(
		ownerID: OwnerID,
		shift: number,
		keyHash: number,
		key: K,
		value: V,
		didChangeSize?: Ref,
		didAlter?: Ref
	): MapNode<K, V> | undefined {
		if (keyHash === undefined) {
			keyHash = hash(key)
		}
		const keyHashFrag = (shift === 0 ? keyHash : keyHash >>> shift) & MASK
		const bit = 1 << keyHashFrag
		const bitmap = this.bitmap
		const exists = (bitmap & bit) !== 0

		if (!exists && value === NOT_SET) {
			return this
		}

		const idx = popCount(bitmap & (bit - 1))
		const nodes = this.nodes
		const node = exists ? nodes[idx] : undefined
		const newNode = updateNode(
			node,
			ownerID,
			shift + SHIFT,
			keyHash,
			key,
			value,
			didChangeSize,
			didAlter
		)

		if (newNode === node) {
			return this
		}

		if (!exists && newNode && nodes.length >= MAX_BITMAP_INDEXED_SIZE) {
			return expandNodes(ownerID, nodes, bitmap, keyHashFrag, newNode)
		}

		if (exists && !newNode && nodes.length === 2 && isLeafNode(nodes[idx ^ 1])) {
			return nodes[idx ^ 1]
		}

		if (exists && newNode && nodes.length === 1 && isLeafNode(newNode)) {
			return newNode
		}

		const isEditable = ownerID && ownerID === this.ownerID
		const newBitmap = exists ? (newNode ? bitmap : bitmap ^ bit) : bitmap | bit
		const newNodes = exists
			? newNode
				? setAt(nodes, idx, newNode, isEditable)
				: spliceOut(nodes, idx, isEditable)
			: spliceIn(nodes, idx, newNode, isEditable)

		if (isEditable) {
			this.bitmap = newBitmap
			this.nodes = newNodes
			return this
		}

		return new BitmapIndexedNode(ownerID, newBitmap, newNodes)
	}
}

class HashArrayMapNode<K, V> {
	constructor(
		public ownerID: OwnerID,
		public count: number,
		public nodes: Array<MapNode<K, V>>
	) {}

	get(shift: number, keyHash: number, key: K, notSetValue?: V): V | undefined {
		if (keyHash === undefined) {
			keyHash = hash(key)
		}
		const idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK
		const node = this.nodes[idx]
		return node ? node.get(shift + SHIFT, keyHash, key, notSetValue) : notSetValue
	}

	update(
		ownerID: OwnerID,
		shift: number,
		keyHash: number,
		key: K,
		value: V,
		didChangeSize?: Ref,
		didAlter?: Ref
	) {
		if (keyHash === undefined) {
			keyHash = hash(key)
		}
		const idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK
		const removed = value === NOT_SET
		const nodes = this.nodes
		const node = nodes[idx]

		if (removed && !node) {
			return this
		}

		const newNode = updateNode(
			node,
			ownerID,
			shift + SHIFT,
			keyHash,
			key,
			value,
			didChangeSize,
			didAlter
		)
		if (newNode === node) {
			return this
		}

		let newCount = this.count
		if (!node) {
			newCount++
		} else if (!newNode) {
			newCount--
			if (newCount < MIN_HASH_ARRAY_MAP_SIZE) {
				return packNodes(ownerID, nodes, newCount, idx)
			}
		}

		const isEditable = ownerID && ownerID === this.ownerID
		const newNodes = setAt(nodes, idx, newNode!, isEditable)

		if (isEditable) {
			this.count = newCount
			this.nodes = newNodes
			return this
		}

		return new HashArrayMapNode(ownerID, newCount, newNodes)
	}
}

class HashCollisionNode<K, V> {
	constructor(
		public ownerID: OwnerID,
		public keyHash: number,
		public entries: Array<[K, V]>
	) {}

	get(shift: number, keyHash: number, key: K, notSetValue?: V) {
		const entries = this.entries
		for (let ii = 0, len = entries.length; ii < len; ii++) {
			if (is(key, entries[ii][0])) {
				return entries[ii][1]
			}
		}
		return notSetValue
	}

	update(
		ownerID: OwnerID,
		shift: number,
		keyHash: number,
		key: K,
		value: V,
		didChangeSize?: Ref,
		didAlter?: Ref
	): MapNode<K, V> {
		if (keyHash === undefined) {
			keyHash = hash(key)
		}

		const removed = value === NOT_SET

		if (keyHash !== this.keyHash) {
			if (removed) {
				return this
			}
			SetRef(didAlter)
			SetRef(didChangeSize)
			return mergeIntoNode(this, ownerID, shift, keyHash, [key, value])
		}

		const entries = this.entries
		let idx = 0
		const len = entries.length
		for (; idx < len; idx++) {
			if (is(key, entries[idx][0])) {
				break
			}
		}
		const exists = idx < len

		if (exists ? entries[idx][1] === value : removed) {
			return this
		}

		SetRef(didAlter)
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
		;(removed || !exists) && SetRef(didChangeSize)

		if (removed && len === 2) {
			return new ValueNode(ownerID, this.keyHash, entries[idx ^ 1])
		}

		const isEditable = ownerID && ownerID === this.ownerID
		const newEntries = isEditable ? entries : arrCopy(entries)

		if (exists) {
			if (removed) {
				// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
				idx === len - 1 ? newEntries.pop() : (newEntries[idx] = newEntries.pop()!)
			} else {
				newEntries[idx] = [key, value]
			}
		} else {
			newEntries.push([key, value])
		}

		if (isEditable) {
			this.entries = newEntries
			return this
		}

		return new HashCollisionNode(ownerID, this.keyHash, newEntries)
	}
}

class ValueNode<K, V> {
	constructor(
		public ownerID: OwnerID,
		public keyHash: number | undefined,
		public entry: [K, V]
	) {}

	get(shift: number, keyHash: number, key: K, notSetValue?: V) {
		return is(key, this.entry[0]) ? this.entry[1] : notSetValue
	}

	update(
		ownerID: OwnerID,
		shift: number,
		keyHash: number | undefined,
		key: K,
		value: V,
		didChangeSize?: Ref,
		didAlter?: Ref
	) {
		const removed = value === NOT_SET
		const keyMatch = is(key, this.entry[0])
		if (keyMatch ? value === this.entry[1] : removed) {
			return this
		}

		SetRef(didAlter)

		if (removed) {
			SetRef(didChangeSize)
			return // undefined
		}

		if (keyMatch) {
			if (ownerID && ownerID === this.ownerID) {
				this.entry[1] = value
				return this
			}
			return new ValueNode(ownerID, this.keyHash, [key, value])
		}

		SetRef(didChangeSize)
		return mergeIntoNode(this, ownerID, shift, hash(key), [key, value])
	}
}

// #pragma Iterators

class MapIterator<K, V> implements Iterator<any>, Iterable<any> {
	_stack

	constructor(
		map: ImmutableMap<K, V>,
		public _type: IterationType,
		public _reverse: boolean
	) {
		this._stack = map._root && mapIteratorFrame<K, V>(map._root)
	}

	[Symbol.iterator](): Iterator<any> {
		return this
	}

	next() {
		const type = this._type
		let stack = this._stack
		while (stack) {
			const node = stack.node as any
			const index = stack.index++
			let maxIndex
			if (node.entry) {
				if (index === 0) {
					return mapIteratorValue(type, node.entry)
				}
			} else if ('entries' in node && node.entries) {
				maxIndex = node.entries.length - 1
				if (index <= maxIndex) {
					return mapIteratorValue(type, node.entries[this._reverse ? maxIndex - index : index])
				}
			} else {
				maxIndex = node.nodes.length - 1
				if (index <= maxIndex) {
					const subNode = node.nodes[this._reverse ? maxIndex - index : index]
					if (subNode) {
						if (subNode.entry) {
							return mapIteratorValue(type, subNode.entry)
						}
						stack = this._stack = mapIteratorFrame(subNode, stack)
					}
					continue
				}
			}
			stack = this._stack = this._stack.__prev!
		}
		return iteratorDone() as any
	}
}

function mapIteratorValue<K, V>(type: IterationType, entry: [K, V]) {
	return iteratorValue(type, entry[0], entry[1])
}

interface IStack {
	node: MapNode<unknown, unknown>
	index: number
	__prev?: IStack
}

function mapIteratorFrame<K, V>(
	node: MapNode<K, V>,
	prev?: { node: MapNode<K, V>; index: number; __prev?: IStack }
): IStack {
	return {
		node: node,
		index: 0,
		__prev: prev,
	}
}

const ITERATE_KEYS = 0
const ITERATE_VALUES = 1
const ITERATE_ENTRIES = 2

type IterationType = typeof ITERATE_KEYS | typeof ITERATE_VALUES | typeof ITERATE_ENTRIES

function iteratorValue<K, V>(
	type: IterationType,
	k: K,
	v: V,
	iteratorResult?: IteratorResult<any>
) {
	const value = type === ITERATE_KEYS ? k : type === ITERATE_VALUES ? v : [k, v]
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
	iteratorResult
		? (iteratorResult.value = value)
		: (iteratorResult = {
				value: value,
				done: false,
			})
	return iteratorResult
}

/**
 * Creates a completed iterator result object indicating iteration is finished.
 * Used internally by map iterators to signal the end of iteration.
 *
 * @returns An IteratorResult object with done set to true and value as undefined
 * @public
 * @example
 * ```ts
 * // Used internally by iterators
 * const result = iteratorDone()
 * console.log(result) // { value: undefined, done: true }
 * ```
 */
export function iteratorDone() {
	return { value: undefined, done: true }
}

function makeMap<K, V>(size: number, root?: MapNode<K, V>, ownerID?: OwnerID, hash?: number) {
	const map = Object.create(ImmutableMap.prototype)
	map.size = size
	map._root = root
	map.__ownerID = ownerID
	map.__hash = hash
	map.__altered = false
	return map
}

let EMPTY_MAP: ImmutableMap<unknown, unknown>
/**
 * Returns a singleton empty ImmutableMap instance.
 * This function is optimized to return the same empty map instance for all calls,
 * saving memory when working with many empty maps.
 *
 * @returns An empty ImmutableMap instance
 * @public
 * @example
 * ```ts
 * // Get an empty map
 * const empty = emptyMap<string, number>()
 * console.log(empty.size) // 0
 *
 * // All empty maps are the same instance
 * const empty1 = emptyMap()
 * const empty2 = emptyMap()
 * console.log(empty1 === empty2) // true
 * ```
 */
export function emptyMap<K, V>(): ImmutableMap<K, V> {
	return (EMPTY_MAP as any) || (EMPTY_MAP = makeMap(0))
}

function updateMap<K, V>(map: ImmutableMap<K, V>, k: K, v: V) {
	let newRoot
	let newSize
	if (!map._root) {
		if (v === NOT_SET) {
			return map
		}
		newSize = 1
		newRoot = new ArrayMapNode(map.__ownerID, [[k, v]])
	} else {
		const didChangeSize = MakeRef()
		const didAlter = MakeRef()
		newRoot = updateNode(map._root, map.__ownerID, 0, undefined, k, v, didChangeSize, didAlter)
		if (!didAlter.value) {
			return map
		}
		newSize = map.size + (didChangeSize.value ? (v === NOT_SET ? -1 : 1) : 0)
	}
	if (map.__ownerID) {
		map.size = newSize
		map._root = newRoot as any
		map.__hash = undefined
		map.__altered = true
		return map
	}
	return newRoot ? makeMap(newSize, newRoot) : emptyMap()
}

function updateNode<K, V>(
	node: MapNode<K, V> | undefined,
	ownerID: OwnerID,
	shift: number,
	keyHash: number | undefined,
	key: K,
	value: V,
	didChangeSize?: Ref,
	didAlter?: Ref
): MapNode<K, V> | undefined {
	if (!node) {
		if (value === NOT_SET) {
			return node
		}
		SetRef(didAlter)
		SetRef(didChangeSize)
		return new ValueNode(ownerID, keyHash, [key, value])
	}
	return node.update(ownerID, shift, keyHash!, key, value, didChangeSize, didAlter) as any
}

function isLeafNode(node: MapNode<unknown, unknown>) {
	return node.constructor === ValueNode || node.constructor === HashCollisionNode
}

function mergeIntoNode<K, V>(
	node: any,
	ownerID: OwnerID,
	shift: number,
	keyHash: number,
	entry: [K, V]
): MapNode<K, V> {
	if (node.keyHash === keyHash) {
		return new HashCollisionNode(ownerID, keyHash, [node.entry, entry])
	}

	const idx1 = (shift === 0 ? node.keyHash : node.keyHash >>> shift) & MASK
	const idx2 = (shift === 0 ? keyHash : keyHash >>> shift) & MASK

	let newNode
	const nodes =
		idx1 === idx2
			? [mergeIntoNode(node, ownerID, shift + SHIFT, keyHash, entry)]
			: ((newNode = new ValueNode(ownerID, keyHash, entry)),
				idx1 < idx2 ? [node, newNode] : [newNode, node])

	return new BitmapIndexedNode(ownerID, (1 << idx1) | (1 << idx2), nodes)
}

function createNodes<K, V>(ownerID: OwnerID, entries: [K, V][], key: K, value: V) {
	if (!ownerID) {
		ownerID = new OwnerID()
	}
	let node: MapNode<K, V> = new ValueNode(ownerID, hash(key), [key, value])
	for (let ii = 0; ii < entries.length; ii++) {
		const entry = entries[ii]
		node = node.update(ownerID, 0, undefined as any as number, entry[0], entry[1]) as any
	}
	return node
}

function packNodes<K, V>(
	ownerID: OwnerID,
	nodes: MapNode<K, V>[],
	count: number,
	excluding: number
) {
	let bitmap = 0
	let packedII = 0
	const packedNodes = new Array(count)
	for (let ii = 0, bit = 1, len = nodes.length; ii < len; ii++, bit <<= 1) {
		const node = nodes[ii]
		if (node !== undefined && ii !== excluding) {
			bitmap |= bit
			packedNodes[packedII++] = node
		}
	}
	return new BitmapIndexedNode(ownerID, bitmap, packedNodes)
}

function expandNodes<K, V>(
	ownerID: OwnerID,
	nodes: MapNode<K, V>[],
	bitmap: number,
	including: number,
	node: MapNode<K, V>
): MapNode<K, V> {
	let count = 0
	const expandedNodes = new Array(SIZE)
	for (let ii = 0; bitmap !== 0; ii++, bitmap >>>= 1) {
		expandedNodes[ii] = bitmap & 1 ? nodes[count++] : undefined
	}
	expandedNodes[including] = node
	return new HashArrayMapNode(ownerID, count + 1, expandedNodes)
}

function popCount(x: number) {
	x -= (x >> 1) & 0x55555555
	x = (x & 0x33333333) + ((x >> 2) & 0x33333333)
	x = (x + (x >> 4)) & 0x0f0f0f0f
	x += x >> 8
	x += x >> 16
	return x & 0x7f
}

function setAt<T>(array: T[], idx: number, val: T, canEdit: boolean): T[] {
	const newArray = canEdit ? array : arrCopy(array)
	newArray[idx] = val
	return newArray
}

function spliceIn<T>(array: T[], idx: number, val: T, canEdit: boolean): T[] {
	const newLen = array.length + 1
	if (canEdit && idx + 1 === newLen) {
		array[idx] = val
		return array
	}
	const newArray = new Array<T>(newLen)
	let after = 0
	for (let ii = 0; ii < newLen; ii++) {
		if (ii === idx) {
			newArray[ii] = val
			after = -1
		} else {
			newArray[ii] = array[ii + after]
		}
	}
	return newArray
}

function spliceOut<T>(array: T[], idx: number, canEdit: boolean) {
	const newLen = array.length - 1
	if (canEdit && idx === newLen) {
		array.pop()
		return array
	}
	const newArray = new Array(newLen)
	let after = 0
	for (let ii = 0; ii < newLen; ii++) {
		if (ii === idx) {
			after = 1
		}
		newArray[ii] = array[ii + after]
	}
	return newArray
}

const MAX_ARRAY_MAP_SIZE = SIZE / 4
const MAX_BITMAP_INDEXED_SIZE = SIZE / 2
const MIN_HASH_ARRAY_MAP_SIZE = SIZE / 4
