import { describe, expect, it } from 'vitest'
import { isWebpAnimated } from './webp'

// Helper function to create a buffer with WebP signature
function createWebpBuffer(size: number, animated = false): ArrayBuffer {
	const buffer = new ArrayBuffer(Math.max(size, 21))
	const view = new Uint8Array(buffer)

	// Set RIFF signature (bytes 0-3: 'RIFF')
	view[0] = 0x52 // R
	view[1] = 0x49 // I
	view[2] = 0x46 // F
	view[3] = 0x46 // F

	// Set file size (bytes 4-7) - little endian
	const fileSize = size - 8
	view[4] = fileSize & 0xff
	view[5] = (fileSize >> 8) & 0xff
	view[6] = (fileSize >> 16) & 0xff
	view[7] = (fileSize >> 24) & 0xff

	// Set WebP signature (bytes 8-11: 'WEBP')
	view[8] = 87 // W
	view[9] = 69 // E
	view[10] = 66 // B
	view[11] = 80 // P

	// Set VP8X chunk header for extended format (bytes 12-19)
	view[12] = 86 // V
	view[13] = 80 // P
	view[14] = 56 // 8
	view[15] = 88 // X

	// Set VP8X chunk size (bytes 16-19) - 10 bytes
	view[16] = 10
	view[17] = 0
	view[18] = 0
	view[19] = 0

	// Set VP8X flags (byte 20) - bit 1 is animation flag
	if (animated) {
		view[20] = 0b00000010 // Animation flag set
	} else {
		view[20] = 0b00000000 // No animation flag
	}

	return buffer
}

describe('isWebpAnimated', () => {
	it('should return false for non-WebP data', () => {
		const buffer = new ArrayBuffer(25)
		const view = new Uint8Array(buffer)
		view[8] = 80 // Not WebP signature
		view[9] = 78
		view[10] = 71
		view[11] = 0

		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should return false for buffer too small for animation check', () => {
		const buffer = new ArrayBuffer(10)
		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should return false for static WebP', () => {
		const buffer = createWebpBuffer(100, false)
		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should return true for animated WebP', () => {
		const buffer = createWebpBuffer(100, true)
		expect(isWebpAnimated(buffer)).toBe(true)
	})

	it('should return false for empty buffer', () => {
		const buffer = new ArrayBuffer(0)
		expect(isWebpAnimated(buffer)).toBe(false)
	})
})
