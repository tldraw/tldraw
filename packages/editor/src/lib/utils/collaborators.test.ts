import { describe, expect, it } from 'vitest'
import { isCursorInViewport } from './collaborators'

// The viewport (page coords) all cases test against; zoom 1 so the 12/16px margins map 1:1.
const viewport = { minX: 0, minY: 0, maxX: 100, maxY: 100 }

describe('isCursorInViewport', () => {
	it('is true for a cursor well inside the viewport', () => {
		expect(isCursorInViewport({ x: 50, y: 50 }, viewport, 1)).toBe(true)
	})

	it('keeps a cursor just past the left/top edges (12/16px margin)', () => {
		expect(isCursorInViewport({ x: -11, y: 50 }, viewport, 1)).toBe(true) // within 12 of left
		expect(isCursorInViewport({ x: -13, y: 50 }, viewport, 1)).toBe(false) // past it
		expect(isCursorInViewport({ x: 50, y: -15 }, viewport, 1)).toBe(true) // within 16 of top
		expect(isCursorInViewport({ x: 50, y: -17 }, viewport, 1)).toBe(false) // past it
	})

	it('culls a cursor beyond the right/bottom edges', () => {
		// Asymmetric with the left/top edges: the max checks subtract the margin rather than add
		// it, so the cull starts *inside* the far edge (maxX - 12, maxY - 16) — a known quirk
		// carried over from the pre-canvas implementation.
		expect(isCursorInViewport({ x: 87, y: 50 }, viewport, 1)).toBe(true) // < maxX - 12 (88)
		expect(isCursorInViewport({ x: 89, y: 50 }, viewport, 1)).toBe(false) // > 88, culled
		expect(isCursorInViewport({ x: 50, y: 83 }, viewport, 1)).toBe(true) // < maxY - 16 (84)
		expect(isCursorInViewport({ x: 50, y: 85 }, viewport, 1)).toBe(false) // > 84, culled
	})

	it('scales the margins by zoom', () => {
		// At zoom 2 the left margin is 12/2 = 6px, so -7 is now culled where -11 survived at zoom 1.
		expect(isCursorInViewport({ x: -5, y: 50 }, viewport, 2)).toBe(true)
		expect(isCursorInViewport({ x: -7, y: 50 }, viewport, 2)).toBe(false)
	})
})
