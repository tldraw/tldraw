/*!
 * MIT License: https://github.com/vHeemstra/is-apng/blob/main/license
 * Copyright (c) Philip van Heemstra
 */

/**
 * Determines whether an ArrayBuffer contains an animated PNG (APNG) image.
 *
 * This function checks if the provided buffer contains a valid PNG file with animation
 * control chunks (acTL) that precede the image data chunks (IDAT), which indicates
 * it's an animated PNG rather than a static PNG.
 *
 * @param buffer - The ArrayBuffer containing the image data to analyze
 * @returns True if the buffer contains an animated PNG, false otherwise
 *
 * @example
 * ```typescript
 * // Check if an uploaded file contains an animated PNG
 * if (file.type === 'image/apng') {
 *   const isAnimated = isApngAnimated(await file.arrayBuffer())
 *   console.log(isAnimated ? 'Animated PNG' : 'Static PNG')
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Use with fetch to check remote images
 * const response = await fetch('image.png')
 * const buffer = await response.arrayBuffer()
 * const hasAnimation = isApngAnimated(buffer)
 * ```
 *
 * @public
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
	 * Returns the index of the first occurrence of a string pattern in a Uint8Array, or -1 if not found.
	 *
	 * Searches for a string pattern by decoding chunks of the byte array to UTF-8 text and using
	 * regular expression matching. Handles cases where the pattern might be split across chunk boundaries.
	 *
	 * @param haystack - The Uint8Array to search in
	 * @param needle - The string or RegExp pattern to locate
	 * @param fromIndex - The array index at which to begin the search
	 * @param upToIndex - The array index up to which to search (optional, defaults to array end)
	 * @param chunksize - Size of the chunks used when searching (default 1024 bytes)
	 * @returns The index position of the first match, or -1 if not found
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
