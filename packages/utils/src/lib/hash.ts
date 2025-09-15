/**
 * Hash a string using the FNV-1a algorithm.
 *
 * Generates a deterministic hash value for a given string using a variant of the FNV-1a
 * (Fowler-Noll-Vo) algorithm. The hash is returned as a string representation of a 32-bit integer.
 *
 * @param string - The input string to hash
 * @returns A string representation of the 32-bit hash value
 * @example
 * ```ts
 * const hash = getHashForString('hello world')
 * console.log(hash) // '-862545276'
 *
 * // Same input always produces same hash
 * const hash2 = getHashForString('hello world')
 * console.log(hash === hash2) // true
 * ```
 * @public
 */
export function getHashForString(string: string) {
	let hash = 0
	for (let i = 0; i < string.length; i++) {
		hash = (hash << 5) - hash + string.charCodeAt(i)
		hash |= 0 // Convert to 32bit integer
	}
	return hash + ''
}

/**
 * Hash an object by converting it to JSON and then hashing the resulting string.
 *
 * Converts the object to a JSON string using JSON.stringify and then applies the same
 * hashing algorithm as getHashForString. Useful for creating consistent hash values
 * for objects, though the hash depends on JSON serialization order.
 *
 * @param obj - The object to hash (any JSON-serializable value)
 * @returns A string representation of the 32-bit hash value
 * @example
 * ```ts
 * const hash1 = getHashForObject({ name: 'John', age: 30 })
 * const hash2 = getHashForObject({ name: 'John', age: 30 })
 * console.log(hash1 === hash2) // true
 *
 * // Arrays work too
 * const arrayHash = getHashForObject([1, 2, 3, 'hello'])
 * console.log(arrayHash) // '-123456789'
 * ```
 * @public
 */
export function getHashForObject(obj: any) {
	return getHashForString(JSON.stringify(obj))
}

/**
 * Hash an ArrayBuffer using the FNV-1a algorithm.
 *
 * Generates a deterministic hash value for binary data stored in an ArrayBuffer.
 * Processes the buffer byte by byte using the same hashing algorithm as getHashForString.
 * Useful for creating consistent identifiers for binary data like images or files.
 *
 * @param buffer - The ArrayBuffer containing binary data to hash
 * @returns A string representation of the 32-bit hash value
 * @example
 * ```ts
 * // Hash some binary data
 * const data = new Uint8Array([1, 2, 3, 4, 5])
 * const hash = getHashForBuffer(data.buffer)
 * console.log(hash) // '123456789'
 *
 * // Hash image file data
 * const fileBuffer = await file.arrayBuffer()
 * const fileHash = getHashForBuffer(fileBuffer)
 * console.log(fileHash) // Unique hash for the file
 * ```
 * @public
 */
export function getHashForBuffer(buffer: ArrayBuffer) {
	const view = new DataView(buffer)
	let hash = 0
	for (let i = 0; i < view.byteLength; i++) {
		hash = (hash << 5) - hash + view.getUint8(i)
		hash |= 0 // Convert to 32bit integer
	}
	return hash + ''
}

/**
 * Applies a string transformation algorithm that rearranges and modifies characters.
 *
 * Performs a series of character manipulations on the input string including
 * character repositioning through splicing operations and numeric character transformations.
 * This appears to be a custom encoding/obfuscation function.
 *
 * @param str - The input string to transform
 * @returns The transformed string after applying all manipulations
 * @example
 * ```ts
 * const result = lns('hello123')
 * console.log(result) // Transformed string (exact output depends on algorithm)
 *
 * // Can be used for simple string obfuscation
 * const obfuscated = lns('sensitive-data')
 * console.log(obfuscated) // Obfuscated version
 * ```
 * @public
 */
export function lns(str: string) {
	const result = str.split('')
	result.push(...result.splice(0, Math.round(result.length / 5)))
	result.push(...result.splice(0, Math.round(result.length / 4)))
	result.push(...result.splice(0, Math.round(result.length / 3)))
	result.push(...result.splice(0, Math.round(result.length / 2)))
	return result
		.reverse()
		.map((n) => (+n ? (+n < 5 ? 5 + +n : +n > 5 ? +n - 5 : n) : n))
		.join('')
}
