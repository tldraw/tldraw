import { describe, expect, it } from 'vitest'
import { isGIF, isGifAnimated } from './gif'

// Polyfill TextDecoder for this test
if (typeof globalThis.TextDecoder === 'undefined') {
	const { TextDecoder, TextEncoder } = require('util')
	globalThis.TextDecoder = TextDecoder
	globalThis.TextEncoder = TextEncoder
}

describe('isGIF', () => {
	it('should return true for valid GIF header', () => {
		const buffer = new ArrayBuffer(10)
		const view = new Uint8Array(buffer)

		// Set GIF header "GIF"
		view[0] = 71 // G
		view[1] = 73 // I
		view[2] = 70 // F

		expect(isGIF(buffer)).toBe(true)
	})

	it('should return false for non-GIF header', () => {
		const buffer = new ArrayBuffer(10)
		const view = new Uint8Array(buffer)

		// Set PNG header instead
		view[0] = 137 // PNG signature
		view[1] = 80 // P
		view[2] = 78 // N

		expect(isGIF(buffer)).toBe(false)
	})

	it('should return false for empty buffer', () => {
		const buffer = new ArrayBuffer(0)
		expect(isGIF(buffer)).toBe(false)
	})

	it('should return false for buffer smaller than header', () => {
		const buffer = new ArrayBuffer(2)
		const view = new Uint8Array(buffer)
		view[0] = 71 // G
		view[1] = 73 // I
		// Missing F

		expect(isGIF(buffer)).toBe(false)
	})

	it('should handle partial GIF header', () => {
		const buffer = new ArrayBuffer(10)
		const view = new Uint8Array(buffer)

		view[0] = 71 // G
		view[1] = 73 // I
		view[2] = 88 // X (not F)

		expect(isGIF(buffer)).toBe(false)
	})
})

describe('isGifAnimated', () => {
	it('should return false for non-GIF data', () => {
		const buffer = new ArrayBuffer(20)
		const view = new Uint8Array(buffer)

		// Set non-GIF header
		view[0] = 80 // P
		view[1] = 78 // N
		view[2] = 71 // G

		expect(isGifAnimated(buffer)).toBe(false)
	})

	it('should return false for empty buffer', () => {
		const buffer = new ArrayBuffer(0)
		expect(isGifAnimated(buffer)).toBe(false)
	})

	it('should return false for buffer too small', () => {
		const buffer = new ArrayBuffer(5)
		const view = new Uint8Array(buffer)

		// Set GIF header
		view[0] = 71 // G
		view[1] = 73 // I
		view[2] = 70 // F

		expect(isGifAnimated(buffer)).toBe(false)
	})

	it('should return false for static GIF with single image descriptor', () => {
		// Create a minimal static GIF structure
		const buffer = new ArrayBuffer(50)
		const view = new Uint8Array(buffer)

		// GIF header "GIF89a"
		view[0] = 71 // G
		view[1] = 73 // I
		view[2] = 70 // F
		view[3] = 56 // 8
		view[4] = 57 // 9
		view[5] = 97 // a

		// Logical screen descriptor (7 bytes)
		view[6] = 10 // width low
		view[7] = 0 // width high
		view[8] = 10 // height low
		view[9] = 0 // height high
		view[10] = 0 // no global color table flag
		view[11] = 0 // background color
		view[12] = 0 // pixel aspect ratio

		// No global color table (flag at bit 7 of view[10] is set but size is 0)

		// Image descriptor (0x2c)
		view[13] = 0x2c // Image descriptor separator
		view[14] = 0 // left low
		view[15] = 0 // left high
		view[16] = 0 // top low
		view[17] = 0 // top high
		view[18] = 10 // width low
		view[19] = 0 // width high
		view[20] = 10 // height low
		view[21] = 0 // height high
		view[22] = 0 // no local color table

		// Image data - LZW minimum code size + data
		view[23] = 2 // LZW minimum code size
		view[24] = 3 // data sub-block size
		view[25] = 1 // some data
		view[26] = 1 // some data
		view[27] = 0 // some data
		view[28] = 0 // end of data sub-blocks

		// Trailer
		view[29] = 0x3b // GIF trailer

		expect(isGifAnimated(buffer)).toBe(false)
	})

	it('should return true for animated GIF with multiple image descriptors', () => {
		// Create a minimal animated GIF structure
		const buffer = new ArrayBuffer(60)
		const view = new Uint8Array(buffer)

		// GIF header "GIF89a"
		view[0] = 71 // G
		view[1] = 73 // I
		view[2] = 70 // F
		view[3] = 56 // 8
		view[4] = 57 // 9
		view[5] = 97 // a

		// Logical screen descriptor (7 bytes)
		view[6] = 10 // width low
		view[7] = 0 // width high
		view[8] = 10 // height low
		view[9] = 0 // height high
		view[10] = 0 // no global color table flag
		view[11] = 0 // background color
		view[12] = 0 // pixel aspect ratio

		// First image descriptor
		view[13] = 0x2c // Image descriptor separator
		view[14] = 0 // left low
		view[15] = 0 // left high
		view[16] = 0 // top low
		view[17] = 0 // top high
		view[18] = 10 // width low
		view[19] = 0 // width high
		view[20] = 10 // height low
		view[21] = 0 // height high
		view[22] = 0 // no local color table

		// First image data
		view[23] = 2 // LZW minimum code size
		view[24] = 3 // data sub-block size
		view[25] = 1 // some data
		view[26] = 1 // some data
		view[27] = 0 // some data
		view[28] = 0 // end of data sub-blocks

		// Second image descriptor (this makes it animated)
		view[29] = 0x2c // Image descriptor separator
		view[30] = 0 // left low
		view[31] = 0 // left high
		view[32] = 0 // top low
		view[33] = 0 // top high
		view[34] = 10 // width low
		view[35] = 0 // width high
		view[36] = 10 // height low
		view[37] = 0 // height high
		view[38] = 0 // no local color table

		// Second image data
		view[39] = 2 // LZW minimum code size
		view[40] = 3 // data sub-block size
		view[41] = 2 // some data
		view[42] = 2 // some data
		view[43] = 0 // some data
		view[44] = 0 // end of data sub-blocks

		// Trailer
		view[45] = 0x3b // GIF trailer

		expect(isGifAnimated(buffer)).toBe(true)
	})

	it('should handle extension blocks correctly', () => {
		// Create GIF with extension blocks that should be skipped
		const buffer = new ArrayBuffer(60)
		const view = new Uint8Array(buffer)

		// GIF header "GIF89a"
		view[0] = 71 // G
		view[1] = 73 // I
		view[2] = 70 // F
		view[3] = 56 // 8
		view[4] = 57 // 9
		view[5] = 97 // a

		// Logical screen descriptor
		view[6] = 10 // width low
		view[7] = 0 // width high
		view[8] = 10 // height low
		view[9] = 0 // height high
		view[10] = 0 // no global color table flag
		view[11] = 0 // background color
		view[12] = 0 // pixel aspect ratio

		// Extension block
		view[13] = 0x21 // Extension introducer
		view[14] = 0xf9 // Graphic control label
		view[15] = 4 // data sub-block size
		view[16] = 0 // some extension data
		view[17] = 0 // some extension data
		view[18] = 0 // some extension data
		view[19] = 0 // some extension data
		view[20] = 0 // end of extension data

		// Single image descriptor
		view[21] = 0x2c // Image descriptor separator
		view[22] = 0 // left low
		view[23] = 0 // left high
		view[24] = 0 // top low
		view[25] = 0 // top high
		view[26] = 10 // width low
		view[27] = 0 // width high
		view[28] = 10 // height low
		view[29] = 0 // height high
		view[30] = 0 // no local color table

		// Image data
		view[31] = 2 // LZW minimum code size
		view[32] = 3 // data sub-block size
		view[33] = 1 // some data
		view[34] = 1 // some data
		view[35] = 0 // some data
		view[36] = 0 // end of data sub-blocks

		// Trailer
		view[37] = 0x3b // GIF trailer

		expect(isGifAnimated(buffer)).toBe(false)
	})

	it('should handle trailer block correctly', () => {
		// Create GIF that ends with trailer block
		const buffer = new ArrayBuffer(40)
		const view = new Uint8Array(buffer)

		// GIF header "GIF89a"
		view[0] = 71 // G
		view[1] = 73 // I
		view[2] = 70 // F
		view[3] = 56 // 8
		view[4] = 57 // 9
		view[5] = 97 // a

		// Logical screen descriptor
		view[6] = 10 // width low
		view[7] = 0 // width high
		view[8] = 10 // height low
		view[9] = 0 // height high
		view[10] = 0 // no global color table flag
		view[11] = 0 // background color
		view[12] = 0 // pixel aspect ratio

		// Image descriptor
		view[13] = 0x2c // Image descriptor separator
		view[14] = 0 // left low
		view[15] = 0 // left high
		view[16] = 0 // top low
		view[17] = 0 // top high
		view[18] = 10 // width low
		view[19] = 0 // width high
		view[20] = 10 // height low
		view[21] = 0 // height high
		view[22] = 0 // no local color table

		// Image data
		view[23] = 2 // LZW minimum code size
		view[24] = 3 // data sub-block size
		view[25] = 1 // some data
		view[26] = 1 // some data
		view[27] = 0 // some data
		view[28] = 0 // end of data sub-blocks

		// Trailer (should stop processing)
		view[29] = 0x3b // GIF trailer

		// Any data after trailer should be ignored
		view[30] = 0x2c // Another image descriptor (should be ignored)

		expect(isGifAnimated(buffer)).toBe(false)
	})

	it('should handle invalid GIF data gracefully', () => {
		const buffer = new ArrayBuffer(30)
		const view = new Uint8Array(buffer)

		// GIF header "GIF89a"
		view[0] = 71 // G
		view[1] = 73 // I
		view[2] = 70 // F
		view[3] = 56 // 8
		view[4] = 57 // 9
		view[5] = 97 // a

		// Logical screen descriptor
		view[6] = 10 // width low
		view[7] = 0 // width high
		view[8] = 10 // height low
		view[9] = 0 // height high
		view[10] = 0 // no global color table flag
		view[11] = 0 // background color
		view[12] = 0 // pixel aspect ratio

		// Invalid block type (not 0x2c, 0x21, or 0x3b)
		view[13] = 0xff // Invalid block type

		expect(isGifAnimated(buffer)).toBe(false)
	})
})
