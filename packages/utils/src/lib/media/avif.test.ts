import { describe, expect, it } from 'vitest'
import { isAvifAnimated } from './avif'

describe('isAvifAnimated', () => {
	it('returns true when 4th byte equals 44', () => {
		const buffer = new ArrayBuffer(10)
		const view = new Uint8Array(buffer)
		view[3] = 44

		expect(isAvifAnimated(buffer)).toBe(true)
	})

	it('returns false when 4th byte is not 44', () => {
		const buffer = new ArrayBuffer(10)
		const view = new Uint8Array(buffer)
		view[3] = 43

		expect(isAvifAnimated(buffer)).toBe(false)
	})

	it('returns false for buffer smaller than 4 bytes', () => {
		const buffer = new ArrayBuffer(3)
		// Accessing index 3 should return undefined, which !== 44
		expect(isAvifAnimated(buffer)).toBe(false)
	})
})
