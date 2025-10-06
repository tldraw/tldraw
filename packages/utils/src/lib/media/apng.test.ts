import { describe, expect, it } from 'vitest'
import { isApngAnimated } from './apng'

describe('isApngAnimated', () => {
	it('returns false for empty ArrayBuffer', () => {
		const buffer = new ArrayBuffer(0)
		expect(isApngAnimated(buffer)).toBe(false)
	})

	it('returns false for buffer too small to be PNG', () => {
		const buffer = new ArrayBuffer(8)
		expect(isApngAnimated(buffer)).toBe(false)
	})

	it('returns false for non-PNG data', () => {
		const buffer = new ArrayBuffer(20)
		const view = new Uint8Array(buffer)
		// JPEG signature instead
		view.set([0xff, 0xd8, 0xff, 0xe0])
		expect(isApngAnimated(buffer)).toBe(false)
	})

	it('returns false for regular PNG with IDAT but no acTL', () => {
		const buffer = new ArrayBuffer(100)
		const view = new Uint8Array(buffer)

		// PNG signature
		view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

		// Add IDAT chunk at position 20
		view.set(new TextEncoder().encode('IDAT'), 20)

		expect(isApngAnimated(buffer)).toBe(false)
	})

	it('returns false when acTL comes after IDAT', () => {
		const buffer = new ArrayBuffer(100)
		const view = new Uint8Array(buffer)

		// PNG signature
		view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

		// IDAT chunk at position 20
		view.set(new TextEncoder().encode('IDAT'), 20)

		// acTL chunk after IDAT - should not count as animated
		view.set(new TextEncoder().encode('acTL'), 30)

		expect(isApngAnimated(buffer)).toBe(false)
	})

	it('returns true for APNG with acTL before IDAT', () => {
		const buffer = new ArrayBuffer(100)
		const view = new Uint8Array(buffer)

		// PNG signature
		view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

		// acTL chunk before IDAT
		view.set(new TextEncoder().encode('acTL'), 15)

		// IDAT chunk
		view.set(new TextEncoder().encode('IDAT'), 30)

		expect(isApngAnimated(buffer)).toBe(true)
	})
})
