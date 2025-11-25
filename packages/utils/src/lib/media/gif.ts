/*!
 * MIT License
 * Modified code originally from <https://github.com/qzb/is-animated>
 * Copyright (c) 2016 Józef Sokołowski <j.k.sokolowski@gmail.com>
 */

/** Returns total length of data blocks sequence */
function getDataBlocksLength(buffer: Uint8Array, offset: number): number {
	let length = 0

	while (buffer[offset + length]) {
		length += buffer[offset + length] + 1
	}

	return length + 1
}

/**
 * Checks if buffer contains GIF image by examining the file header.
 *
 * @param buffer - The ArrayBuffer containing the image data to check
 * @returns True if the buffer contains a GIF image, false otherwise
 * @example
 * ```ts
 * // Check a file from user input
 * const file = event.target.files[0]
 * const buffer = await file.arrayBuffer()
 * const isGif = isGIF(buffer)
 * console.log(isGif ? 'GIF image' : 'Not a GIF')
 * ```
 * @public
 */
export function isGIF(buffer: ArrayBuffer): boolean {
	const enc = new TextDecoder('ascii')
	const header = enc.decode(buffer.slice(0, 3))
	return header === 'GIF'
}

/**
 * Checks if buffer contains animated GIF image by parsing the GIF structure and counting image descriptors.
 * A GIF is considered animated if it contains more than one image descriptor block.
 *
 * @param buffer - The ArrayBuffer containing the GIF image data
 * @returns True if the GIF is animated (contains multiple frames), false otherwise
 * @example
 * ```ts
 * // Check if a GIF file is animated
 * const file = event.target.files[0]
 * if (file.type === 'image/gif') {
 *   const buffer = await file.arrayBuffer()
 *   const animated = isGifAnimated(buffer)
 *   console.log(animated ? 'Animated GIF' : 'Static GIF')
 * }
 * ```
 * @public
 */
export function isGifAnimated(buffer: ArrayBuffer): boolean {
	const view = new Uint8Array(buffer)
	let hasColorTable, colorTableSize
	let offset = 0
	let imagesCount = 0

	// Check if this is this image has valid GIF header.
	// If not return false. Chrome, FF and IE doesn't handle GIFs with invalid version.
	if (!isGIF(buffer)) {
		return false
	}

	// Skip header, logical screen descriptor and global color table

	hasColorTable = view[10] & 0x80 // 0b10000000
	colorTableSize = view[10] & 0x07 // 0b00000111

	offset += 6 // skip header
	offset += 7 // skip logical screen descriptor
	offset += hasColorTable ? 3 * Math.pow(2, colorTableSize + 1) : 0 // skip global color table

	// Find if there is more than one image descriptor

	while (imagesCount < 2 && offset < view.length) {
		switch (view[offset]) {
			// Image descriptor block. According to specification there could be any
			// number of these blocks (even zero). When there is more than one image
			// descriptor browsers will display animation (they shouldn't when there
			// is no delays defined, but they do it anyway).
			case 0x2c:
				imagesCount += 1

				hasColorTable = view[offset + 9] & 0x80 // 0b10000000
				colorTableSize = view[offset + 9] & 0x07 // 0b00000111

				offset += 10 // skip image descriptor
				offset += hasColorTable ? 3 * Math.pow(2, colorTableSize + 1) : 0 // skip local color table
				offset += getDataBlocksLength(view, offset + 1) + 1 // skip image data

				break

			// Skip all extension blocks. In theory this "plain text extension" blocks
			// could be frames of animation, but no browser renders them.
			case 0x21:
				offset += 2 // skip introducer and label
				offset += getDataBlocksLength(view, offset) // skip this block and following data blocks

				break

			// Stop processing on trailer block,
			// all data after this point will is ignored by decoders
			case 0x3b:
				offset = view.length // fast forward to end of buffer
				break

			// Oops! This GIF seems to be invalid
			default:
				// fast forward to end of buffer
				offset = view.length
				break
		}
	}

	return imagesCount > 1
}
