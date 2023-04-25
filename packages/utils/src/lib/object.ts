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
