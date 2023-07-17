// =========================
// Modified code originally from <https://github.com/qzb/is-animated>
//
// # [MIT License](https://spdx.org/licenses/MIT)
//
// Copyright (c) 2016 Józef Sokołowski <j.k.sokolowski@gmail.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// =========================

/** Returns total length of data blocks sequence */
function getDataBlocksLength(buffer: Uint8Array, offset: number): number {
	let length = 0

	while (buffer[offset + length]) {
		length += buffer[offset + length] + 1
	}

	return length + 1
}

/**
 * Checks if buffer contains GIF image
 *
 * @public
 */
export function isGIF(buffer: ArrayBuffer): boolean {
	const enc = new TextDecoder('ascii')
	const header = enc.decode(buffer.slice(0, 3))
	return header === 'GIF'
}

/**
 * Checks if buffer contains animated GIF image
 *
 * @public
 */
export function isAnimated(buffer: ArrayBuffer): boolean {
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
