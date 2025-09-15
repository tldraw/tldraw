import { describe, expect, it } from 'vitest'
import { isAvifAnimated } from './avif'

describe('isAvifAnimated', () => {
	describe('animated AVIF detection', () => {
		it('returns true when 4th byte equals 44', () => {
			const buffer = new ArrayBuffer(10)
			const view = new Uint8Array(buffer)

			// Set the 4th byte (index 3) to 44
			view[3] = 44

			expect(isAvifAnimated(buffer)).toBe(true)
		})

		it('handles minimum buffer size with animation marker', () => {
			const buffer = new ArrayBuffer(4)
			const view = new Uint8Array(buffer)

			// Set the 4th byte (index 3) to 44
			view[3] = 44

			expect(isAvifAnimated(buffer)).toBe(true)
		})

		it('returns true with other bytes set but 4th byte is 44', () => {
			const buffer = new ArrayBuffer(20)
			const view = new Uint8Array(buffer)

			// Fill with random data
			view.fill(123)
			// Set the critical 4th byte
			view[3] = 44

			expect(isAvifAnimated(buffer)).toBe(true)
		})
	})

	describe('static AVIF detection', () => {
		it('returns false when 4th byte is not 44', () => {
			const buffer = new ArrayBuffer(10)
			const view = new Uint8Array(buffer)

			// Set the 4th byte to something other than 44
			view[3] = 43

			expect(isAvifAnimated(buffer)).toBe(false)
		})

		it('returns false when 4th byte is 0 (default)', () => {
			const buffer = new ArrayBuffer(10)
			// ArrayBuffer is initialized with zeros by default

			expect(isAvifAnimated(buffer)).toBe(false)
		})

		it('returns false when 4th byte is 45 (one more than target)', () => {
			const buffer = new ArrayBuffer(10)
			const view = new Uint8Array(buffer)

			view[3] = 45

			expect(isAvifAnimated(buffer)).toBe(false)
		})

		it('returns false for various non-44 values', () => {
			const testValues = [0, 1, 43, 45, 100, 255]

			testValues.forEach((value) => {
				const buffer = new ArrayBuffer(10)
				const view = new Uint8Array(buffer)
				view[3] = value

				expect(isAvifAnimated(buffer)).toBe(false)
			})
		})
	})

	describe('edge cases and boundary conditions', () => {
		it('handles empty ArrayBuffer', () => {
			const buffer = new ArrayBuffer(0)

			// Should not throw and return false (accessing undefined index)
			expect(isAvifAnimated(buffer)).toBe(false)
		})

		it('handles buffer smaller than 4 bytes', () => {
			const sizes = [1, 2, 3]

			sizes.forEach((size) => {
				const buffer = new ArrayBuffer(size)
				// Accessing index 3 on smaller buffers should return undefined, which !== 44
				expect(isAvifAnimated(buffer)).toBe(false)
			})
		})

		it('handles very large buffers', () => {
			const buffer = new ArrayBuffer(10000)
			const view = new Uint8Array(buffer)

			// Set animation marker
			view[3] = 44

			expect(isAvifAnimated(buffer)).toBe(true)
		})

		it('only checks the 4th byte regardless of other data', () => {
			const buffer = new ArrayBuffer(100)
			const view = new Uint8Array(buffer)

			// Fill entire buffer with 44s
			view.fill(44)
			// But change the 4th byte to something else
			view[3] = 99

			expect(isAvifAnimated(buffer)).toBe(false)
		})
	})

	describe('byte value precision', () => {
		it('is precise about the value 44', () => {
			const buffer = new ArrayBuffer(10)
			const view = new Uint8Array(buffer)

			// Test values around 44
			const testCases = [
				{ value: 42, expected: false },
				{ value: 43, expected: false },
				{ value: 44, expected: true }, // Only this should be true
				{ value: 45, expected: false },
				{ value: 46, expected: false },
			]

			testCases.forEach(({ value, expected }) => {
				view[3] = value
				expect(isAvifAnimated(buffer)).toBe(expected)
			})
		})

		it('handles all possible byte values correctly', () => {
			const buffer = new ArrayBuffer(10)
			const view = new Uint8Array(buffer)

			// Test all possible byte values (0-255)
			for (let i = 0; i <= 255; i++) {
				view[3] = i
				const result = isAvifAnimated(buffer)

				if (i === 44) {
					expect(result).toBe(true)
				} else {
					expect(result).toBe(false)
				}
			}
		})
	})

	describe('buffer type handling', () => {
		it('works with ArrayBuffer from different sources', () => {
			// Create ArrayBuffer in different ways
			const methods = [
				() => new ArrayBuffer(10),
				() => new Uint8Array(10).buffer,
				() => new Int8Array(10).buffer,
				() => new DataView(new ArrayBuffer(10)).buffer,
			]

			methods.forEach((createBuffer) => {
				const buffer = createBuffer()
				const view = new Uint8Array(buffer)
				view[3] = 44

				expect(isAvifAnimated(buffer)).toBe(true)
			})
		})

		it('handles buffers with different initial data patterns', () => {
			const patterns = [
				// All zeros
				new Uint8Array([0, 0, 0, 44, 0, 0]),
				// All 255s except position 3
				new Uint8Array([255, 255, 255, 44, 255, 255]),
				// Alternating pattern
				new Uint8Array([0, 255, 0, 44, 0, 255]),
				// Random-ish data
				new Uint8Array([123, 67, 89, 44, 12, 200]),
			]

			patterns.forEach((pattern) => {
				expect(isAvifAnimated(pattern.buffer)).toBe(true)
			})
		})
	})
})
