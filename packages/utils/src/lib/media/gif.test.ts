import { describe, expect, it } from 'vitest'
import { isGIF, isGifAnimated } from './gif'

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
})
