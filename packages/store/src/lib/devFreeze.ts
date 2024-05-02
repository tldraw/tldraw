/**
 * Freeze an object when in development mode. Copied from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
 *
 * @example
 *
 * ```ts
 * const frozen = devFreeze({ a: 1 })
 * ```
 *
 * @param object - The object to freeze.
 * @returns The frozen object when in development mode, or else the object when in other modes.
 * @public
 */
export function devFreeze<T>(object: T): T {
	if (process.env.NODE_ENV === 'production') {
		return object
	}
	const proto = Object.getPrototypeOf(object)
	if (proto && !(proto === Array.prototype || proto === Object.prototype)) {
		console.error('cannot include non-js data in a record', object)
		throw new Error('cannot include non-js data in a record')
	}

	// Retrieve the property names defined on object
	const propNames = Object.getOwnPropertyNames(object)

	// Recursively freeze properties before freezing self
	for (const name of propNames) {
		const value = (object as any)[name]

		if (value && typeof value === 'object') {
			devFreeze(value)
		}
	}

	return Object.freeze(object)
}
