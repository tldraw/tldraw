/**
 * A function that customizes the comparison of values in {@link isEqualWith}. It receives the two
 * values being compared, plus (when comparing nested values) the index or key of the value and the
 * parent objects containing each value. Return `true` or `false` to short-circuit the comparison,
 * or `undefined` to fall back to the default deep equality logic.
 *
 * @public
 */
export type EqualityCustomizer = (
	value: any,
	other: any,
	indexOrKey?: PropertyKey,
	parent?: any,
	otherParent?: any
) => boolean | undefined

/**
 * Perform a deep comparison between two values to determine if they are equivalent. Supports
 * primitives (treating `NaN` as equal to `NaN`), plain objects, arrays, `Date`, `RegExp`, `Map`,
 * `Set`, `Error`, typed arrays, `ArrayBuffer`, and cyclic structures.
 *
 * @param a - The value to compare
 * @param b - The other value to compare
 * @returns True if the values are deeply equal
 * @example
 * ```ts
 * isEqual({ a: [1, 2] }, { a: [1, 2] }) // true
 * isEqual(new Set([1]), new Set([2])) // false
 * ```
 * @public
 */
export function isEqual(a: any, b: any): boolean {
	return compareValues(a, b, undefined, undefined, undefined, undefined, undefined)
}

/**
 * Like {@link isEqual}, but accepts a customizer function that can override the comparison of any
 * pair of values. The customizer is invoked for the top-level values and every nested value pair;
 * returning `undefined` falls back to the default deep equality logic.
 *
 * @param a - The value to compare
 * @param b - The other value to compare
 * @param customizer - The function to customize comparisons
 * @returns True if the values are deeply equal
 * @public
 */
export function isEqualWith(a: any, b: any, customizer?: EqualityCustomizer): boolean {
	return compareValues(a, b, customizer, undefined, undefined, undefined, undefined)
}

function compareValues(
	a: any,
	b: any,
	customizer: EqualityCustomizer | undefined,
	indexOrKey: PropertyKey | undefined,
	parentA: any,
	parentB: any,
	stack: Map<any, any> | undefined
): boolean {
	if (customizer) {
		const result = customizer(a, b, indexOrKey, parentA, parentB)
		if (result !== undefined) return !!result
	}
	if (a === b) return true
	// treat NaN as equal to NaN
	if (a !== a && b !== b) return true
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
	return compareObjects(a, b, customizer, stack ?? new Map())
}

function compareObjects(
	a: any,
	b: any,
	customizer: EqualityCustomizer | undefined,
	stack: Map<any, any>
): boolean {
	const tag = Object.prototype.toString.call(a)
	if (tag !== Object.prototype.toString.call(b)) return false

	switch (tag) {
		case '[object Boolean]':
		case '[object Number]':
		case '[object Date]': {
			const aValue = +a
			const bValue = +b
			return aValue === bValue || (aValue !== aValue && bValue !== bValue)
		}
		case '[object String]':
		case '[object RegExp]':
			return `${a}` === `${b}`
		case '[object Symbol]':
			return a.valueOf() === b.valueOf()
		case '[object Error]':
			return a.name === b.name && a.message === b.message
		case '[object ArrayBuffer]':
		case '[object DataView]':
			return compareBytes(toBytes(a), toBytes(b))
	}
	if (ArrayBuffer.isView(a)) {
		return compareBytes(toBytes(a), toBytes(b))
	}
	if (
		tag !== '[object Array]' &&
		tag !== '[object Arguments]' &&
		tag !== '[object Object]' &&
		tag !== '[object Map]' &&
		tag !== '[object Set]'
	) {
		return false
	}

	// handle circular references: if we're already comparing this pair, assume equal
	if (stack.has(a) || stack.has(b)) {
		return stack.get(a) === b
	}
	stack.set(a, b)
	stack.set(b, a)
	try {
		switch (tag) {
			case '[object Array]':
			case '[object Arguments]': {
				if (a.length !== b.length) return false
				for (let i = 0; i < a.length; i++) {
					if (!compareValues(a[i], b[i], customizer, i, a, b, stack)) return false
				}
				return true
			}
			case '[object Map]':
				return compareUnordered(
					Array.from((a as Map<any, any>).entries()),
					Array.from((b as Map<any, any>).entries()),
					customizer,
					stack
				)
			case '[object Set]':
				return compareUnordered(
					Array.from(a as Set<any>),
					Array.from(b as Set<any>),
					customizer,
					stack
				)
			default: {
				const keys = getOwnEnumerableKeys(a)
				if (keys.length !== getOwnEnumerableKeys(b).length) return false
				for (const key of keys) {
					if (!Object.prototype.hasOwnProperty.call(b, key)) return false
					if (!compareValues(a[key], b[key], customizer, key, a, b, stack)) return false
				}
				// objects with different constructors are not equal, unless both are base objects
				const ctorA = a.constructor
				const ctorB = b.constructor
				if (
					ctorA !== ctorB &&
					'constructor' in a &&
					'constructor' in b &&
					!(
						typeof ctorA === 'function' &&
						ctorA instanceof ctorA &&
						typeof ctorB === 'function' &&
						ctorB instanceof ctorB
					)
				) {
					return false
				}
				return true
			}
		}
	} finally {
		stack.delete(a)
		stack.delete(b)
	}
}

function getOwnEnumerableKeys(obj: object): (string | symbol)[] {
	const keys: (string | symbol)[] = Object.keys(obj)
	for (const symbol of Object.getOwnPropertySymbols(obj)) {
		if (Object.prototype.propertyIsEnumerable.call(obj, symbol)) {
			keys.push(symbol)
		}
	}
	return keys
}

function compareUnordered(
	aItems: any[],
	bItems: any[],
	customizer: EqualityCustomizer | undefined,
	stack: Map<any, any>
): boolean {
	if (aItems.length !== bItems.length) return false
	const used = new Array(bItems.length).fill(false)
	outer: for (const item of aItems) {
		for (let i = 0; i < bItems.length; i++) {
			if (
				!used[i] &&
				compareValues(item, bItems[i], customizer, undefined, aItems, bItems, stack)
			) {
				used[i] = true
				continue outer
			}
		}
		return false
	}
	return true
}

function toBytes(view: ArrayBuffer | ArrayBufferView): Uint8Array {
	if (view instanceof ArrayBuffer) return new Uint8Array(view)
	return new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
}

function compareBytes(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}
	return true
}
