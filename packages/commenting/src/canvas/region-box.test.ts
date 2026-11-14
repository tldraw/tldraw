import { describe, expect, it } from 'vitest'
import { selectionCornerSizing } from './region-box'

// The numbers mirror SelectionForegroundOverlayUtil's corner handles at zoom 1.
describe('selectionCornerSizing', () => {
	it('matches the selection corner hit square with a mouse', () => {
		expect(selectionCornerSizing(200, 100, false)).toEqual({
			hitSize: 13.5,
			hideAlternateCorners: false,
			showOnlyOneCorner: false,
		})
	})

	it('grows the hit square for a coarse pointer', () => {
		expect(selectionCornerSizing(200, 100, true).hitSize).toBeCloseTo(41.34, 2)
	})

	it('shrinks the hit square only when both axes are small', () => {
		// One small axis: the other axis's full target still sets the square.
		expect(selectionCornerSizing(20, 100, false).hitSize).toBe(13.5)
		expect(selectionCornerSizing(20, 20, false).hitSize).toBe(6.75)
	})

	it('hides corners on tiny boxes like the selection does', () => {
		expect(selectionCornerSizing(10, 100, false)).toMatchObject({
			hideAlternateCorners: true,
			showOnlyOneCorner: false,
		})
		expect(selectionCornerSizing(10, 10, false)).toMatchObject({
			hideAlternateCorners: true,
			showOnlyOneCorner: true,
		})
	})
})
