import { Group2d } from '../../primitives/geometry/Group2d'
import { Polyline2d } from '../../primitives/geometry/Polyline2d'
import { Rectangle2d } from '../../primitives/geometry/Rectangle2d'
import { Vec } from '../../primitives/Vec'
import {
	classifyClosedShapeHit,
	classifyFrameLikeHit,
	createHitRanking,
	getBestHit,
	getBestOpenShapeHit,
	getDistanceToGeometry,
	offerHollowHit,
	offerMarginHit,
} from './hitTest'

function rect(opts: { width?: number; height?: number; isFilled?: boolean } = {}) {
	const { width = 100, height = 100, isFilled = false } = opts
	return new Rectangle2d({ width, height, isFilled })
}

function label(opts: { width?: number; height?: number } = {}) {
	const { width = 40, height = 20 } = opts
	return new Rectangle2d({ x: 30, y: 40, width, height, isFilled: true, isLabel: true })
}

const margins = { innerMargin: 0, outerMargin: 0, hitInside: false }

describe('getDistanceToGeometry', () => {
	it('returns a negative distance inside a filled shape', () => {
		const geometry = rect({ isFilled: true })
		expect(
			getDistanceToGeometry(geometry, new Vec(50, 50), {
				isGroup: false,
				hitLabels: false,
				hitInside: false,
				outerMargin: 10,
			})
		).toBeLessThan(0)
	})

	it('returns Infinity when the point fails the broad phase', () => {
		expect(
			getDistanceToGeometry(rect(), new Vec(500, 500), {
				isGroup: false,
				hitLabels: false,
				hitInside: false,
				outerMargin: 10,
			})
		).toBe(Infinity)
	})

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

	it('takes the nearest child of a group', () => {
		const geometry = new Group2d({ children: [rect(), label()] })
		const nearLabel = getDistanceToGeometry(geometry, new Vec(50, 45), {
			isGroup: true,
			hitLabels: true,
			hitInside: false,
			outerMargin: 0,
		})
		expect(nearLabel).toBeLessThan(0)
	})

	it('skips label children unless hitLabels is set', () => {
		const geometry = new Group2d({ children: [rect(), label()] })
		const point = new Vec(50, 45)
		const withLabels = getDistanceToGeometry(geometry, point, {
			isGroup: true,
			hitLabels: true,
			hitInside: false,
			outerMargin: 0,
		})
		const withoutLabels = getDistanceToGeometry(geometry, point, {
			isGroup: true,
			hitLabels: false,
			hitInside: false,
			outerMargin: 0,
		})
		expect(withoutLabels).toBeGreaterThan(withLabels)
	})
})

describe('classifyFrameLikeHit', () => {
	const geometry = rect()

	it('selects the frame when the point is within its outer margin', () => {
		expect(
			classifyFrameLikeHit(geometry, new Vec(105, 50), {
				innerMargin: 0,
				outerMargin: 10,
				hitFrameInside: false,
			})
		).toBe('in-margin')
	})

	it('reports the body when the point is inside the frame', () => {
		expect(
			classifyFrameLikeHit(geometry, new Vec(50, 50), {
				innerMargin: 0,
				outerMargin: 10,
				hitFrameInside: false,
			})
		).toBe('body')
	})

	it('counts the inner margin only when hitting frames from inside', () => {
		// Just inside the right edge: hitFrameInside picks up the frame, otherwise it is the body
		const filled = rect({ isFilled: true })
		const point = new Vec(96, 50)
		const opts = { innerMargin: 10, outerMargin: 10 }
		expect(classifyFrameLikeHit(filled, point, { ...opts, hitFrameInside: true })).toBe('in-margin')
		expect(classifyFrameLikeHit(filled, point, { ...opts, hitFrameInside: false })).toBe('body')
	})

	it('passes through when the point is clear of the frame', () => {
		expect(
			classifyFrameLikeHit(geometry, new Vec(500, 500), {
				innerMargin: 0,
				outerMargin: 10,
				hitFrameInside: false,
			})
		).toBe('behind')
	})
})

describe('classifyClosedShapeHit', () => {
	it('hits a filled shape', () => {
		const geometry = rect({ isFilled: true })
		expect(
			classifyClosedShapeHit(geometry, new Vec(50, 50), -50, {
				...margins,
				isGroup: false,
				hasMarginHit: false,
			})
		).toEqual({ type: 'filled' })
	})

	it('reports a filled shape that rejects the hit as ignored', () => {
		const geometry = rect({ isFilled: true })
		geometry.ignoreHit = () => true
		expect(
			classifyClosedShapeHit(geometry, new Vec(50, 50), -50, {
				...margins,
				isGroup: false,
				hasMarginHit: false,
			})
		).toEqual({ type: 'ignored' })
	})

	it('treats a group whose first child is filled as filled', () => {
		const geometry = new Group2d({ children: [rect({ isFilled: true }), label()] })
		expect(
			classifyClosedShapeHit(geometry, new Vec(50, 50), -50, {
				...margins,
				isGroup: true,
				hasMarginHit: false,
			})
		).toEqual({ type: 'filled' })
	})

	it('records the absolute distance for an in-margin edge', () => {
		expect(
			classifyClosedShapeHit(rect(), new Vec(50, 50), -3, {
				innerMargin: 8,
				outerMargin: 8,
				hitInside: false,
				isGroup: false,
				hasMarginHit: false,
			})
		).toEqual({ type: 'in-margin', distance: 3 })
	})

	it('falls back to the hollow interior when no edge is close', () => {
		const geometry = rect({ width: 200, height: 200 })
		expect(
			classifyClosedShapeHit(geometry, new Vec(100, 100), -100, {
				innerMargin: 0,
				outerMargin: 0,
				hitInside: true,
				isGroup: false,
				hasMarginHit: false,
			})
		).toEqual({ type: 'hollow' })
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

	it('misses when the point is beyond the outer margin', () => {
		expect(
			classifyClosedShapeHit(rect(), new Vec(500, 500), 400, {
				...margins,
				isGroup: false,
				hasMarginHit: false,
			})
		).toEqual({ type: 'miss' })
	})
})

describe('hit ranking', () => {
	it('keeps the closest edge and the smallest hollow shape', () => {
		const ranking = createHitRanking<string>()
		offerMarginHit(ranking, 'far', 10)
		offerMarginHit(ranking, 'near', 2)
		offerMarginHit(ranking, 'alsoFar', 8)
		offerHollowHit(ranking, 'big', 900)
		offerHollowHit(ranking, 'small', 100)
		expect(ranking.marginHit).toBe('near')
		expect(ranking.hollowHit).toBe('small')
	})

	it('prefers an edge hit over a hollow hit', () => {
		const ranking = createHitRanking<string>()
		offerHollowHit(ranking, 'hollow', 100)
		expect(getBestHit(ranking)).toBe('hollow')
		offerMarginHit(ranking, 'edge', 4)
		expect(getBestHit(ranking)).toBe('edge')
	})

	it('returns undefined when nothing was hit', () => {
		expect(getBestHit(createHitRanking<string>())).toBeUndefined()
	})

	it('lets an equally close edge above an open shape win', () => {
		const ranking = createHitRanking<string>()
		offerMarginHit(ranking, 'edge', 4)
		expect(getBestOpenShapeHit(ranking, 'line', 4)).toBe('edge')
		expect(getBestOpenShapeHit(ranking, 'line', 3)).toBe('line')
	})

	it('takes the open shape when no edge was hit', () => {
		expect(getBestOpenShapeHit(createHitRanking<string>(), 'line', 3)).toBe('line')
	})
})
