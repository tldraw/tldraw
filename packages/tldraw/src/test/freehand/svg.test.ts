import { describe, expect, it } from 'vitest'
import { getSvgPathFromStrokePoints } from '../../lib/shapes/shared/freehand/svg'
import { StrokePoint } from '../../lib/shapes/shared/freehand/types'

function pt(x: number, y: number): StrokePoint {
	return { point: { x, y } } as StrokePoint
}

// The corpus never produces a two-point stroke, so the parity gate doesn't
// cover this branch; keep a direct check on its output.
describe('getSvgPathFromStrokePoints', () => {
	it('renders a two-point stroke as a single relative line', () => {
		expect(getSvgPathFromStrokePoints([pt(0, 0), pt(10.5, 20.25)])).toBe('M0,0 l10.5,20.25 ')
	})

	it('renders nothing for fewer than two points', () => {
		expect(getSvgPathFromStrokePoints([])).toBe('')
		expect(getSvgPathFromStrokePoints([pt(5, 5)])).toBe('')
	})
})
