/*!
 * MIT License: https://github.com/vHeemstra/is-apng/blob/main/license
 * Copyright (c) Philip van Heemstra
 */

export function isApngAnimated(buffer: ArrayBuffer): boolean {
	const view = new Uint8Array(buffer)

	if (
		!view ||
		!((typeof Buffer !== 'undefined' && Buffer.isBuffer(view)) || view instanceof Uint8Array) ||
		view.length < 16
	) {
		return false
	}

	const isPNG =
		view[0] === 0x89 &&
		view[1] === 0x50 &&
		view[2] === 0x4e &&
		view[3] === 0x47 &&
		view[4] === 0x0d &&
		view[5] === 0x0a &&
		view[6] === 0x1a &&
		view[7] === 0x0a

	if (!isPNG) {
		return false
	}

	/**
	 * Returns the index of the first occurrence of a sequence in an typed array, or -1 if it is not present.
	 *
	 * Works similar to `Array.prototype.indexOf()`, but it searches for a sequence of array values (bytes).
	 * The bytes in the `haystack` array are decoded (UTF-8) and then used to search for `needle`.
	 *
	 * @param haystack `Uint8Array`
	 * Array to search in.
	 *
	 * @param needle `string | RegExp`
	 * The value to locate in the array.
	 *
	 * @param fromIndex `number`
	 * The array index at which to begin the search.
	 *
	 * @param upToIndex `number`
	 * The array index up to which to search.
	 * If omitted, search until the end.
	 *
	 * @param chunksize `number`
	 * Size of the chunks used when searching (default 1024).
	 *
	 * @returns boolean
	 * Whether the array holds Animated PNG data.
	 */
	function indexOfSubstring(
		haystack: Uint8Array,
		needle: string | RegExp,
		fromIndex: number,
		upToIndex?: number,
		chunksize = 1024 /* Bytes */
	) {
		/**
		 * Adopted from: https://stackoverflow.com/a/67771214/2142071
		 */

		if (!needle) {
			return -1
		}
		needle = new RegExp(needle, 'g')

		// The needle could get split over two chunks.
		// So, at every chunk we prepend the last few characters
		// of the last chunk.
		const needle_length = needle.source.length
		const decoder = new TextDecoder()

		// Handle search offset in line with
		// `Array.prototype.indexOf()` and `TypedArray.prototype.subarray()`.
		const full_haystack_length = haystack.length
		if (typeof upToIndex === 'undefined') {
			upToIndex = full_haystack_length
		}
		if (fromIndex >= full_haystack_length || upToIndex <= 0 || fromIndex >= upToIndex) {
			return -1
		}
		haystack = haystack.subarray(fromIndex, upToIndex)

		let position = -1
		let current_index = 0
		let full_length = 0
		let needle_buffer = ''

		outer: while (current_index < haystack.length) {
			const next_index = current_index + chunksize
			// subarray doesn't copy
			const chunk = haystack.subarray(current_index, next_index)
			const decoded = decoder.decode(chunk, { stream: true })

			const text = needle_buffer + decoded

			let match: RegExpExecArray | null
			let last_index = -1
			while ((match = needle.exec(text)) !== null) {
				last_index = match.index - needle_buffer.length
				position = full_length + last_index
				break outer
			}

			current_index = next_index
			full_length += decoded.length

			// Check that the buffer doesn't itself include the needle
			// this would cause duplicate finds (we could also use a Set to avoid that).
			const needle_index =
				last_index > -1 ? last_index + needle_length : decoded.length - needle_length
			needle_buffer = decoded.slice(needle_index)
		}

		// Correct for search offset.
		if (position >= 0) {
			position += fromIndex >= 0 ? fromIndex : full_haystack_length + fromIndex
		}

		return position
	}

	// APNGs have an animation control chunk ('acTL') preceding the IDATs.
	// See: https://en.wikipedia.org/wiki/APNG#File_format
	const idatIdx = indexOfSubstring(view, 'IDAT', 12)
	if (idatIdx >= 12) {
		const actlIdx = indexOfSubstring(view, 'acTL', 8, idatIdx)
		return actlIdx >= 8
	}

	return false
}

// globalThis.isApng = isApng

// (new TextEncoder()).encode('IDAT')
// Decimal: [73, 68, 65, 84]
// Hex: [0x49, 0x44, 0x41, 0x54]

// (new TextEncoder()).encode('acTL')
// Decimal: [97, 99, 84, 76]
// Hex: [0x61, 0x63, 0x54, 0x4C]

// const idatIdx = buffer.indexOf('IDAT')
// const actlIdx = buffer.indexOf('acTL')
