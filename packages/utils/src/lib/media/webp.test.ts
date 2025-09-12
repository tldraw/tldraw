import { describe, expect, it } from 'vitest'
import { isWebpAnimated } from './webp'

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
})
