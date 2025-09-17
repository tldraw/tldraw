import { describe, expect, it } from 'vitest'
import { isWebp, isWebpAnimated } from './webp'

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

describe('isWebp (internal function)', () => {
	it('should return true for valid WebP signature', () => {
		const buffer = createWebpBuffer(25)
		const view = new Uint8Array(buffer)
		expect(isWebp(view)).toBe(true)
	})

	it('should return false for null/undefined input', () => {
		expect(isWebp(null as any)).toBe(false)
		expect(isWebp(undefined as any)).toBe(false)
	})

	it('should return false for buffer smaller than 12 bytes', () => {
		const view = new Uint8Array(11)
		expect(isWebp(view)).toBe(false)
	})

	it('should return false for exactly 11 bytes', () => {
		const view = new Uint8Array(11)
		// Set partial WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		// Missing P at position 11
		expect(isWebp(view)).toBe(false)
	})

	it('should return true for exactly 12 bytes with valid signature', () => {
		const view = new Uint8Array(12)
		// Set WebP signature at bytes 8-11
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P
		expect(isWebp(view)).toBe(true)
	})

	it('should return false for incorrect W byte (position 8)', () => {
		const view = new Uint8Array(12)
		view[8] = 86 // V instead of W (87)
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P
		expect(isWebp(view)).toBe(false)
	})

	it('should return false for incorrect E byte (position 9)', () => {
		const view = new Uint8Array(12)
		view[8] = 87 // W
		view[9] = 70 // F instead of E (69)
		view[10] = 66 // B
		view[11] = 80 // P
		expect(isWebp(view)).toBe(false)
	})

	it('should return false for incorrect B byte (position 10)', () => {
		const view = new Uint8Array(12)
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 67 // C instead of B (66)
		view[11] = 80 // P
		expect(isWebp(view)).toBe(false)
	})

	it('should return false for incorrect P byte (position 11)', () => {
		const view = new Uint8Array(12)
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 81 // Q instead of P (80)
		expect(isWebp(view)).toBe(false)
	})

	it('should ignore bytes before position 8', () => {
		const view = new Uint8Array(12)
		// Set random data in first 8 bytes
		for (let i = 0; i < 8; i++) {
			view[i] = Math.floor(Math.random() * 256)
		}
		// Set correct WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P
		expect(isWebp(view)).toBe(true)
	})

	it('should ignore bytes after position 11', () => {
		const view = new Uint8Array(20)
		// Set correct WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P
		// Set random data after
		for (let i = 12; i < 20; i++) {
			view[i] = Math.floor(Math.random() * 256)
		}
		expect(isWebp(view)).toBe(true)
	})

	it('should handle very large buffers', () => {
		const view = new Uint8Array(10000)
		// Set correct WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P
		expect(isWebp(view)).toBe(true)
	})
})

describe('isWebpAnimated', () => {
	it('should return false for non-WebP data', () => {
		// Create a buffer with invalid WebP signature
		const buffer = new ArrayBuffer(25)
		const view = new Uint8Array(buffer)
		// Set some random data that's not WebP
		view[8] = 80 // Not 87 (W)
		view[9] = 78 // Not 69 (E)
		view[10] = 71 // Not 66 (B)
		view[11] = 0 // Not 80 (P)

		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should return false for buffer too small to contain WebP header', () => {
		const buffer = new ArrayBuffer(10) // Too small (needs at least 12 bytes)
		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should return false for buffer with exactly 12 bytes (minimum WebP)', () => {
		const buffer = new ArrayBuffer(12)
		const view = new Uint8Array(buffer)
		// Set WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P
		// Cannot check animation flag because buffer is too small (needs 21 bytes)
		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should return false for valid WebP but too small for animation flag', () => {
		const buffer = new ArrayBuffer(20) // Valid WebP size but too small for animation check
		const view = new Uint8Array(buffer)

		// Set WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P

		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should return false for buffers with sizes 13-20 bytes', () => {
		// Test all sizes between minimum WebP (12) and minimum animation check (21)
		for (let size = 13; size <= 20; size++) {
			const buffer = new ArrayBuffer(size)
			const view = new Uint8Array(buffer)

			// Set WebP signature
			view[8] = 87 // W
			view[9] = 69 // E
			view[10] = 66 // B
			view[11] = 80 // P

			expect(isWebpAnimated(buffer), `Buffer size ${size} should return false`).toBe(false)
		}
	})

	it('should return false for static WebP', () => {
		const buffer = new ArrayBuffer(25)
		const view = new Uint8Array(buffer)

		// Set WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P

		// Set animation flag to 0 (static)
		// Animation flag is at byte 20, bit 1
		view[20] = 0b00000000 // No animation flag set

		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should return false for realistic static WebP with helper', () => {
		const buffer = createWebpBuffer(100, false)
		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should return true for animated WebP', () => {
		const buffer = new ArrayBuffer(25)
		const view = new Uint8Array(buffer)

		// Set WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P

		// Set animation flag to 1
		// Animation flag is at byte 20, bit 1 (shifted right by 1)
		view[20] = 0b00000010 // Animation flag set

		expect(isWebpAnimated(buffer)).toBe(true)
	})

	it('should return true for realistic animated WebP with helper', () => {
		const buffer = createWebpBuffer(100, true)
		expect(isWebpAnimated(buffer)).toBe(true)
	})

	it('should handle edge case with exactly 21 bytes', () => {
		const buffer = new ArrayBuffer(21) // Minimum size for animation check
		const view = new Uint8Array(buffer)

		// Set WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P

		// Set animation flag
		view[20] = 0b00000010

		expect(isWebpAnimated(buffer)).toBe(true)
	})

	it('should handle edge case with exactly 21 bytes - static', () => {
		const buffer = new ArrayBuffer(21) // Minimum size for animation check
		const view = new Uint8Array(buffer)

		// Set WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P

		// Set no animation flag
		view[20] = 0b00000000

		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should return false for empty buffer', () => {
		const buffer = new ArrayBuffer(0)
		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should handle various bit patterns in animation byte', () => {
		const buffer = new ArrayBuffer(25)
		const view = new Uint8Array(buffer)

		// Set WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P

		// Test different bit patterns
		// Animation flag is bit 1 (when shifted right by 1)

		// 0b00000000 - no animation
		view[20] = 0b00000000
		expect(isWebpAnimated(buffer)).toBe(false)

		// 0b00000010 - animation flag set
		view[20] = 0b00000010
		expect(isWebpAnimated(buffer)).toBe(true)

		// 0b00000011 - animation flag set with other bits
		view[20] = 0b00000011
		expect(isWebpAnimated(buffer)).toBe(true)

		// 0b11111110 - animation flag set with all other bits
		view[20] = 0b11111110
		expect(isWebpAnimated(buffer)).toBe(true)

		// 0b11111101 - no animation flag but other bits set
		view[20] = 0b11111101
		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should test all possible values for animation byte', () => {
		const buffer = new ArrayBuffer(25)
		const view = new Uint8Array(buffer)

		// Set WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P

		// Test all 256 possible byte values
		for (let i = 0; i <= 255; i++) {
			view[20] = i
			const shouldBeAnimated = ((i >> 1) & 1) === 1
			const result = isWebpAnimated(buffer)
			expect(
				result,
				`Byte value ${i} (0b${i.toString(2).padStart(8, '0')}) should return ${shouldBeAnimated}`
			).toBe(shouldBeAnimated)
		}
	})

	it('should handle realistic WebP file structure', () => {
		// Create a buffer that looks more like a real WebP file
		const buffer = new ArrayBuffer(50)
		const view = new Uint8Array(buffer)

		// RIFF header
		view[0] = 0x52 // R
		view[1] = 0x49 // I
		view[2] = 0x46 // F
		view[3] = 0x46 // F

		// File size (little-endian) - 42 bytes
		view[4] = 42
		view[5] = 0
		view[6] = 0
		view[7] = 0

		// WebP signature
		view[8] = 87 // W
		view[9] = 69 // E
		view[10] = 66 // B
		view[11] = 80 // P

		// VP8X chunk identifier
		view[12] = 86 // V
		view[13] = 80 // P
		view[14] = 56 // 8
		view[15] = 88 // X

		// VP8X chunk size (little-endian) - 10 bytes
		view[16] = 10
		view[17] = 0
		view[18] = 0
		view[19] = 0

		// VP8X flags - animation bit set
		view[20] = 0b00000010

		expect(isWebpAnimated(buffer)).toBe(true)

		// Now test without animation
		view[20] = 0b00000000
		expect(isWebpAnimated(buffer)).toBe(false)
	})

	it('should handle malformed WebP signatures gracefully', () => {
		const testCases = [
			// Case insensitive variations (should fail)
			{ bytes: [119, 69, 66, 80], desc: 'lowercase w' }, // webp
			{ bytes: [87, 101, 66, 80], desc: 'lowercase e' }, // Webp
			{ bytes: [87, 69, 98, 80], desc: 'lowercase b' }, // WEbp
			{ bytes: [87, 69, 66, 112], desc: 'lowercase p' }, // WEBp

			// Similar looking bytes
			{ bytes: [86, 69, 66, 80], desc: 'V instead of W' }, // VEBP
			{ bytes: [87, 70, 66, 80], desc: 'F instead of E' }, // WFBP
			{ bytes: [87, 69, 67, 80], desc: 'C instead of B' }, // WECP
			{ bytes: [87, 69, 66, 81], desc: 'Q instead of P' }, // WEBQ

			// Null bytes
			{ bytes: [0, 69, 66, 80], desc: 'null W' },
			{ bytes: [87, 0, 66, 80], desc: 'null E' },
			{ bytes: [87, 69, 0, 80], desc: 'null B' },
			{ bytes: [87, 69, 66, 0], desc: 'null P' },
		]

		testCases.forEach(({ bytes, desc }) => {
			const buffer = new ArrayBuffer(25)
			const view = new Uint8Array(buffer)

			// Set the test signature
			view[8] = bytes[0]
			view[9] = bytes[1]
			view[10] = bytes[2]
			view[11] = bytes[3]

			// Set animation flag
			view[20] = 0b00000010

			expect(isWebpAnimated(buffer), `Should return false for ${desc}`).toBe(false)
		})
	})
})
