import { Group2d } from '../../primitives/geometry/Group2d'
import { Polyline2d } from '../../primitives/geometry/Polyline2d'
import { Rectangle2d } from '../../primitives/geometry/Rectangle2d'
import { Vec } from '../../primitives/Vec'
import { classifyClosedShapeHit, classifyFrameLikeHit, getDistanceToGeometry } from './hitTest'

// Filled, hollow, label, frame and ignored hits are covered through the editor in
// packages/tldraw/src/test/getShapeAtPoint.test.ts and transparent-image-hit-test.test.ts. These
// are the edges those don't reach.

function rect(opts: { width?: number; height?: number; isFilled?: boolean } = {}) {
	const { width = 100, height = 100, isFilled = false } = opts
	return new Rectangle2d({ width, height, isFilled })
}

describe('getDistanceToGeometry', () => {
	it('measures a thin shape exactly even at zero margin', () => {
		// A straight line has no height, so it would never pass a point-in-bounds broad phase
		const line = new Polyline2d({ points: [new Vec(0, 0), new Vec(100, 0)] })
		expect(
			getDistanceToGeometry(line, new Vec(50, 4), {
				isGroup: false,
				hitLabels: false,
				hitInside: false,
				outerMargin: 0,
			})
		).toBeCloseTo(4)
	})
})

describe('classifyFrameLikeHit', () => {
	it('counts the inner margin only when hitting frames from inside', () => {
		// Just inside the right edge: hitFrameInside picks up the frame, otherwise it is the body
		const filled = rect({ isFilled: true })
		const point = new Vec(96, 50)
		const opts = { innerMargin: 10, outerMargin: 10 }
		expect(classifyFrameLikeHit(filled, point, { ...opts, hitFrameInside: true })).toBe('in-margin')
		expect(classifyFrameLikeHit(filled, point, { ...opts, hitFrameInside: false })).toBe('body')
	})
})

describe('classifyClosedShapeHit', () => {
	it('treats a group whose first child is filled as filled', () => {
		const label = new Rectangle2d({
			x: 30,
			y: 40,
			width: 40,
			height: 20,
			isFilled: true,
			isLabel: true,
		})
		const geometry = new Group2d({ children: [rect({ isFilled: true }), label] })
		expect(
			classifyClosedShapeHit(geometry, new Vec(50, 50), -50, {
				innerMargin: 0,
				outerMargin: 0,
				hitInside: false,
				isGroup: true,
				hasMarginHit: false,
			})
		).toEqual({ type: 'filled' })
	})

	it('does not offer a hollow interior once an edge has been hit', () => {
		expect(
			classifyClosedShapeHit(rect({ width: 200, height: 200 }), new Vec(100, 100), -100, {
				innerMargin: 0,
				outerMargin: 0,
				hitInside: true,
				isGroup: false,
				hasMarginHit: true,
			})
		).toEqual({ type: 'miss' })
	})
})
