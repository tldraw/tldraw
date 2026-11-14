import { Box } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { getEdgeToEdgeFrame } from './boardCapture'

describe('getEdgeToEdgeFrame', () => {
	it('fills the image with the bounds when they match its aspect ratio', () => {
		expect(getEdgeToEdgeFrame(new Box(10, 20, 400, 100), 2560, 640)).toEqual({
			bounds: new Box(10, 20, 400, 100),
			scale: 6.4,
		})
	})

	// The editor's zoom stops at 5%, which is what used to crop clusters this wide.
	it('scales past the editor’s zoom limits rather than cropping', () => {
		expect(getEdgeToEdgeFrame(new Box(0, 0, 200_000, 50_000), 2560, 640)).toEqual({
			bounds: new Box(0, 0, 200_000, 50_000),
			scale: 0.0128,
		})
	})

	// The worker sized the image from a measure; if the bounds have shifted since, centre them rather
	// than stretch the picture.
	it('centres bounds that no longer match the image, rather than stretching them', () => {
		expect(getEdgeToEdgeFrame(new Box(0, 0, 400, 200), 2560, 640)).toEqual({
			bounds: new Box(-200, 0, 800, 200),
			scale: 3.2,
		})
	})

	it('fits a zero-height line by its length', () => {
		const { bounds, scale } = getEdgeToEdgeFrame(new Box(0, 10, 500, 0), 2560, 1)
		expect(scale).toBe(5.12)
		expect(bounds.w).toBe(500)
		expect(bounds.midY).toBe(10)
	})

	it('draws a point at 100%', () => {
		expect(getEdgeToEdgeFrame(new Box(5, 5, 0, 0), 100, 50)).toEqual({
			bounds: new Box(-45, -20, 100, 50),
			scale: 1,
		})
	})
})
