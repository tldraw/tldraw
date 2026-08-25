/**
 * A customizer for {@link isEqualWith}. Return `true` or `false` to decide equality for a pair of
 * values yourself, or `undefined` to fall back to the default deep comparison for that pair. The
 * customizer is invoked for the root values first and then for every nested pair.
 *
 * @public
 */
export type IsEqualCustomizer = (a: unknown, b: unknown) => boolean | undefined

/**
 * Deep equality comparison of two values.
 *
 * Compares primitives by value (`NaN` equals `NaN`), and recursively compares arrays, plain
 * objects and class instances (own enumerable string keys), `Date`, `RegExp`, `Map`, `Set`,
 * `ArrayBuffer` and typed arrays. Objects with different constructors are never equal. Circular
 * references are tolerated.
 *
 * @param a - The first value
 * @param b - The second value
 * @returns True if the values are deeply equal
 *
 * @example
 * ```ts
 * isEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }) // true
 * isEqual(new Map([['x', 1]]), new Map([['x', 1]])) // true
 * isEqual(NaN, NaN) // true
 * isEqual({ a: 1 }, { a: 1, b: undefined }) // false
 * ```
 *
 * @public
 */
export function isEqual(a: unknown, b: unknown): boolean {
	return baseIsEqual(a, b, undefined, undefined)
}

/**
 * Deep equality comparison of two values with a customizer that can override the comparison for
 * any pair of values. See {@link IsEqualCustomizer}.
 *
 * @param a - The first value
 * @param b - The second value
 * @param customizer - Decides equality for a pair, or returns `undefined` to use the default
 * @returns True if the values are deeply equal
 *
 * @example
 * ```ts
 * // Compare numbers with a tolerance, everything else structurally
 * isEqualWith({ x: 0.1 + 0.2 }, { x: 0.3 }, (a, b) => {
 * 	if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6
 * 	return undefined
 * }) // true
 * ```
 *
 * @public
 */
export function isEqualWith(a: unknown, b: unknown, customizer: IsEqualCustomizer): boolean {
	return baseIsEqual(a, b, customizer, undefined)
}

// Pairs of objects currently being compared further up the call stack. Re-encountering an object
// means we're in a cycle; it is equal only if it's paired with the same partner as before (the
// same rule lodash uses), which is also what stops the recursion.
type Stack = Map<object, object>

function baseIsEqual(
	a: unknown,
	b: unknown,
	customizer: IsEqualCustomizer | undefined,
	stack: Stack | undefined
): boolean {
	if (customizer) {
		const result = customizer(a, b)
		if (result !== undefined) return result
	}

	if (a === b) return true
	// NaN is the only value that is not equal to itself
	if (a !== a && b !== b) return true

	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
		return false
	}

	stack ??= new Map()
	const partner = stack.get(a)
	if (partner !== undefined) return partner === b

	stack.set(a, b)
	try {
		return compareObjects(a, b, customizer, stack)
	} finally {
		stack.delete(a)
	}
}

function compareObjects(
	a: object,
	b: object,
	customizer: IsEqualCustomizer | undefined,
	stack: Stack
): boolean {
	const tag = Object.prototype.toString.call(a)
	if (tag !== Object.prototype.toString.call(b)) return false

	switch (tag) {
		case '[object Date]':
			return +(a as Date) === +(b as Date)
		case '[object RegExp]':
			return String(a) === String(b)
		case '[object ArrayBuffer]':
			return compareBytes(new Uint8Array(a as ArrayBuffer), new Uint8Array(b as ArrayBuffer))
		case '[object Map]':
			return compareMaps(a as Map<unknown, unknown>, b as Map<unknown, unknown>, customizer, stack)
		case '[object Set]':
			return compareSets(a as Set<unknown>, b as Set<unknown>, customizer, stack)
		case '[object Array]':
			return compareArrays(a as unknown[], b as unknown[], customizer, stack)
	}

	if (ArrayBuffer.isView(a)) {
		return compareArrays(
			a as unknown as ArrayLike<unknown>,
			b as unknown as ArrayLike<unknown>,
			customizer,
			stack
		)
	}

	if (a.constructor !== b.constructor) return false

	const keysA = Object.keys(a)
	if (keysA.length !== Object.keys(b).length) return false
	for (const key of keysA) {
		if (!Object.prototype.hasOwnProperty.call(b, key)) return false
		if (!baseIsEqual((a as any)[key], (b as any)[key], customizer, stack)) return false
	}
	return true
}

function compareArrays(
	a: ArrayLike<unknown>,
	b: ArrayLike<unknown>,
	customizer: IsEqualCustomizer | undefined,
	stack: Stack
): boolean {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (!baseIsEqual(a[i], b[i], customizer, stack)) return false
	}
	return true
}

function compareBytes(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}
	return true
}

function compareMaps(
	a: Map<unknown, unknown>,
	b: Map<unknown, unknown>,
	customizer: IsEqualCustomizer | undefined,
	stack: Stack
): boolean {
	if (a.size !== b.size) return false
	for (const [key, value] of a) {
		if (!b.has(key)) return false
		if (!baseIsEqual(value, b.get(key), customizer, stack)) return false
	}
	return true
}

function compareSets(
	a: Set<unknown>,
	b: Set<unknown>,
	customizer: IsEqualCustomizer | undefined,
	stack: Stack
): boolean {
	if (a.size !== b.size) return false
	// Members that are objects can't be looked up by identity, so fall back to a search for a deeply
	// equal member that hasn't already been matched.
	let unmatched: unknown[] | undefined
	outer: for (const value of a) {
		if (b.has(value)) continue
		if (typeof value !== 'object' || value === null) return false
		unmatched ??= Array.from(b).filter((other) => !a.has(other))
		for (let i = 0; i < unmatched.length; i++) {
			if (baseIsEqual(value, unmatched[i], customizer, stack)) {
				unmatched.splice(i, 1)
				continue outer
			}
		}
		return false
	}
	return true
}
