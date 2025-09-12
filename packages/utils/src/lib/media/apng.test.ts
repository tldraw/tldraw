import { describe, expect, it } from 'vitest'
import { isApngAnimated } from './apng'

// Polyfill TextDecoder/TextEncoder for this test
if (typeof globalThis.TextDecoder === 'undefined') {
	const { TextDecoder, TextEncoder } = require('util')
	globalThis.TextDecoder = TextDecoder
	globalThis.TextEncoder = TextEncoder
}

// Helper function to create byte arrays from strings
function stringToBytes(str: string): Uint8Array {
	const bytes = new Uint8Array(str.length)
	for (let i = 0; i < str.length; i++) {
		bytes[i] = str.charCodeAt(i)
	}
	return bytes
}

describe('isApngAnimated', () => {
	describe('invalid input handling', () => {
		it('returns false for empty ArrayBuffer', () => {
			const buffer = new ArrayBuffer(0)
			expect(isApngAnimated(buffer)).toBe(false)
		})

		it('returns false for buffer too small to be PNG', () => {
			const buffer = new ArrayBuffer(8) // Less than 16 bytes minimum
			expect(isApngAnimated(buffer)).toBe(false)
		})

		it('returns false for buffer with invalid PNG signature', () => {
			const buffer = new ArrayBuffer(16)
			const view = new Uint8Array(buffer)
			// Wrong PNG signature
			view.set([0x89, 0x50, 0x4e, 0x48, 0x0d, 0x0a, 0x1a, 0x0a])
			expect(isApngAnimated(buffer)).toBe(false)
		})

		it('returns false for non-PNG data', () => {
			const buffer = new ArrayBuffer(20)
			const view = new Uint8Array(buffer)
			// JPEG signature instead
			view.set([0xff, 0xd8, 0xff, 0xe0])
			expect(isApngAnimated(buffer)).toBe(false)
		})
	})

	describe('PNG format validation', () => {
		it('validates correct PNG signature', () => {
			const buffer = new ArrayBuffer(20)
			const view = new Uint8Array(buffer)
			// Correct PNG signature but no IDAT chunk
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
			expect(isApngAnimated(buffer)).toBe(false)
		})

		it('returns false for PNG without IDAT chunk', () => {
			const buffer = new ArrayBuffer(50)
			const view = new Uint8Array(buffer)
			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
			// No IDAT chunk present
			expect(isApngAnimated(buffer)).toBe(false)
		})
	})

	describe('regular PNG detection', () => {
		it('returns false for regular PNG with IDAT but no acTL', () => {
			const buffer = new ArrayBuffer(100)
			const view = new Uint8Array(buffer)

			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// Add IDAT chunk at position 20
			const idatBytes = stringToBytes('IDAT')
			view.set(idatBytes, 20)

			// No acTL chunk present
			expect(isApngAnimated(buffer)).toBe(false)
		})

		it('returns false when acTL comes after IDAT', () => {
			const buffer = new ArrayBuffer(100)
			const view = new Uint8Array(buffer)

			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// IDAT chunk at position 20
			const idatBytes = stringToBytes('IDAT')
			view.set(idatBytes, 20)

			// acTL chunk after IDAT (position 30) - should not count as animated
			const actlBytes = stringToBytes('acTL')
			view.set(actlBytes, 30)

			expect(isApngAnimated(buffer)).toBe(false)
		})
	})

	describe('animated PNG detection', () => {
		it('returns true for APNG with acTL before IDAT', () => {
			const buffer = new ArrayBuffer(100)
			const view = new Uint8Array(buffer)

			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// acTL chunk at position 15 (before IDAT)
			const actlBytes = stringToBytes('acTL')
			view.set(actlBytes, 15)

			// IDAT chunk at position 30
			const idatBytes = stringToBytes('IDAT')
			view.set(idatBytes, 30)

			expect(isApngAnimated(buffer)).toBe(true)
		})

		it('returns true when acTL is at minimum valid position', () => {
			const buffer = new ArrayBuffer(100)
			const view = new Uint8Array(buffer)

			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// acTL chunk at position 8 (minimum valid position)
			const actlBytes = stringToBytes('acTL')
			view.set(actlBytes, 8)

			// IDAT chunk at position 20
			const idatBytes = stringToBytes('IDAT')
			view.set(idatBytes, 20)

			expect(isApngAnimated(buffer)).toBe(true)
		})

		it('returns false when acTL is too early (before position 8)', () => {
			const buffer = new ArrayBuffer(100)
			const view = new Uint8Array(buffer)

			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// acTL chunk at position 6 (too early, should be ignored)
			const actlBytes = stringToBytes('acTL')
			view.set(actlBytes, 6)

			// IDAT chunk at position 20
			const idatBytes = stringToBytes('IDAT')
			view.set(idatBytes, 20)

			expect(isApngAnimated(buffer)).toBe(false)
		})

		it('handles multiple acTL chunks correctly', () => {
			const buffer = new ArrayBuffer(150)
			const view = new Uint8Array(buffer)

			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// First acTL chunk at position 10
			const actlBytes = stringToBytes('acTL')
			view.set(actlBytes, 10)

			// Second acTL chunk at position 20
			view.set(actlBytes, 20)

			// IDAT chunk at position 40
			const idatBytes = stringToBytes('IDAT')
			view.set(idatBytes, 40)

			expect(isApngAnimated(buffer)).toBe(true)
		})
	})

	describe('edge cases and boundaries', () => {
		it('handles exactly 16-byte buffer', () => {
			const buffer = new ArrayBuffer(16)
			const view = new Uint8Array(buffer)

			// PNG signature takes 8 bytes
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// Remaining 8 bytes - not enough for chunk detection
			expect(isApngAnimated(buffer)).toBe(false)
		})

		it('handles IDAT at position 12 (minimum valid position)', () => {
			const buffer = new ArrayBuffer(50)
			const view = new Uint8Array(buffer)

			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// IDAT chunk at position 12 (minimum search position)
			const idatBytes = stringToBytes('IDAT')
			view.set(idatBytes, 12)

			// No acTL chunk
			expect(isApngAnimated(buffer)).toBe(false)
		})

		it('returns false when IDAT is before position 12', () => {
			const buffer = new ArrayBuffer(50)
			const view = new Uint8Array(buffer)

			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// IDAT chunk at position 10 (too early, should not be found)
			const idatBytes = stringToBytes('IDAT')
			view.set(idatBytes, 10)

			expect(isApngAnimated(buffer)).toBe(false)
		})

		it('handles large buffers efficiently', () => {
			const buffer = new ArrayBuffer(10000)
			const view = new Uint8Array(buffer)

			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// acTL chunk at position 1000
			const actlBytes = stringToBytes('acTL')
			view.set(actlBytes, 1000)

			// IDAT chunk at position 5000
			const idatBytes = stringToBytes('IDAT')
			view.set(idatBytes, 5000)

			expect(isApngAnimated(buffer)).toBe(true)
		})

		it('handles chunks that span across search boundaries', () => {
			// Create a buffer where chunk names might be split across internal search chunks
			const buffer = new ArrayBuffer(2048) // Larger than default chunk size of 1024
			const view = new Uint8Array(buffer)

			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// acTL chunk positioned to potentially span search boundary
			const actlBytes = stringToBytes('acTL')
			view.set(actlBytes, 1022) // Near 1024 boundary

			// IDAT chunk after
			const idatBytes = stringToBytes('IDAT')
			view.set(idatBytes, 1500)

			expect(isApngAnimated(buffer)).toBe(true)
		})
	})

	describe('binary data edge cases', () => {
		it('handles buffer with null bytes', () => {
			const buffer = new ArrayBuffer(100)
			const view = new Uint8Array(buffer)

			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// Fill with null bytes
			view.fill(0, 8)

			// acTL chunk
			const actlBytes = stringToBytes('acTL')
			view.set(actlBytes, 15)

			// IDAT chunk
			const idatBytes = stringToBytes('IDAT')
			view.set(idatBytes, 30)

			expect(isApngAnimated(buffer)).toBe(true)
		})

		it('handles buffer with random binary data', () => {
			const buffer = new ArrayBuffer(200)
			const view = new Uint8Array(buffer)

			// PNG signature
			view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

			// Fill with random bytes
			for (let i = 8; i < view.length; i++) {
				view[i] = Math.floor(Math.random() * 256)
			}

			// Place acTL and IDAT in correct positions
			const actlBytes = stringToBytes('acTL')
			view.set(actlBytes, 20)

			const idatBytes = stringToBytes('IDAT')
			view.set(idatBytes, 50)

			expect(isApngAnimated(buffer)).toBe(true)
		})
	})
})
