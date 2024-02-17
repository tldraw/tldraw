/** @internal */
export function hasOwnProperty(obj: object, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(obj, key)
}

/** @internal */
export function getOwnProperty<K extends string, V>(
	obj: Partial<Record<K, V>>,
	key: K
): V | undefined
/** @internal */
export function getOwnProperty(obj: object, key: string): unknown
/** @internal */
export function getOwnProperty(obj: object, key: string): unknown {
	if (!hasOwnProperty(obj, key)) {
		return undefined
	}
	// @ts-expect-error we know the property exists
	return obj[key]
}

/**
 * Deep copy function for TypeScript.
 *
 * @example
 *
 * ```ts
 * const A = deepCopy({ a: 1, b: { c: 2 } })
 * ```
 *
 * @param obj - Target value to be copied.
 * @public
 * @see Source - project, ts-deeply https://github.com/ykdr2017/ts-deepcopy
 * @see Code - pen https://codepen.io/erikvullings/pen/ejyBYg
 */
export function deepCopy<T = unknown>(obj: T): T {
	if (!obj) return obj
	if (Array.isArray(obj)) {
		const arr: unknown[] = []
		const length = obj.length
		for (let i = 0; i < length; i++) arr.push(deepCopy(obj[i]))
		return arr as unknown as T
	} else if (typeof obj === 'object') {
		const keys = Object.keys(obj!)
		const length = keys.length
		const newObject: any = {}
		for (let i = 0; i < length; i++) {
			const key = keys[i]
			newObject[key] = deepCopy((obj as any)[key])
		}
		return newObject
	}
	return obj
}

/**
 * An alias for `Object.keys` that treats the object as a map and so preserves the type of the keys.
 *
 * @internal
 */
export function objectMapKeys<Key extends string>(object: {
	readonly [K in Key]: unknown
}): Array<Key> {
	return Object.keys(object) as Key[]
}

/**
 * An alias for `Object.values` that treats the object as a map and so preserves the type of the
 * keys.
 *
 * @internal
 */
export function objectMapValues<Key extends string, Value>(object: {
	[K in Key]: Value
}): Array<Value> {
	return Object.values(object) as Value[]
}

/**
 * An alias for `Object.entries` that treats the object as a map and so preserves the type of the
 * keys.
 *
 * @internal
 */
export function objectMapEntries<Key extends string, Value>(object: {
	[K in Key]: Value
}): Array<[Key, Value]> {
	return Object.entries(object) as [Key, Value][]
}

/**
 * An alias for `Object.fromEntries` that treats the object as a map and so preserves the type of the
 * keys.
 *
 * @internal
 */
export function objectMapFromEntries<Key extends string, Value>(
	entries: ReadonlyArray<readonly [Key, Value]>
): { [K in Key]: Value } {
	return Object.fromEntries(entries) as { [K in Key]: Value }
}

/**
 * Filters an object using a predicate function.
 * @returns a new object with only the entries that pass the predicate
 * @internal
 */
export function filterEntries<Key extends string, Value>(
	object: { [K in Key]: Value },
	predicate: (key: Key, value: Value) => boolean
): { [K in Key]: Value } {
	const result: { [K in Key]?: Value } = {}
	let didChange = false
	for (const [key, value] of objectMapEntries(object)) {
		if (predicate(key, value)) {
			result[key] = value
		} else {
			didChange = true
		}
	}
	return didChange ? (result as { [K in Key]: Value }) : object
}

/**
 * Maps the values of one object map to another.
 * @returns a new object with the entries mapped
 * @internal
 */
export function mapObjectMapValues<Key extends string, ValueBefore, ValueAfter>(
	object: { readonly [K in Key]: ValueBefore },
	mapper: (key: Key, value: ValueBefore) => ValueAfter
): { [K in Key]: ValueAfter } {
	const result = {} as { [K in Key]: ValueAfter }
	for (const [key, value] of objectMapEntries(object)) {
		const newValue = mapper(key, value)
		result[key] = newValue
	}
	return result
}

/** @internal */
export function areObjectsShallowEqual<T extends Record<string, unknown>>(
	obj1: T,
	obj2: T
): boolean {
	if (obj1 === obj2) return true
	const keys1 = new Set(Object.keys(obj1))
	const keys2 = new Set(Object.keys(obj2))
	if (keys1.size !== keys2.size) return false
	for (const key of keys1) {
		if (!keys2.has(key)) return false
		if (!Object.is(obj1[key], obj2[key])) return false
	}
	return true
}
