import { Mat } from '../Mat'
import { Vec, VecLike } from '../Vec'
import { Edge2d } from './Edge2d'
import { Geometry2dFilters, TransformedGeometry2d } from './Geometry2d'
import { Group2d } from './Group2d'
import { Rectangle2d } from './Rectangle2d'

// Two rectangles side by side with a gap between them
const rectA = () => new Rectangle2d({ width: 100, height: 50, isFilled: true })
const rectB = () => new Rectangle2d({ x: 200, width: 50, height: 50, isFilled: false })
// A small filled label to the right of both, and an internal geometry further right
const label = () =>
	new Rectangle2d({ x: 300, width: 20, height: 20, isFilled: true, isLabel: true })
const internal = () =>
	new Rectangle2d({ x: 400, width: 10, height: 10, isFilled: true, isInternal: true })

const group = () => new Group2d({ children: [rectA(), rectB()] })
const groupWithLabel = () => new Group2d({ children: [rectA(), label(), rectB()] })

// An L shaped path made of two edges, 200 units long in total
const path = () =>
	new Group2d({
		children: [
			new Edge2d({ start: new Vec(0, 0), end: new Vec(100, 0) }),
			new Edge2d({ start: new Vec(100, 0), end: new Vec(100, 100) }),
		],
	})

function sortByX(points: VecLike[]) {
	const round = (n: number) => Math.round(n * 1e6) / 1e6
	return [...points]
		.map((p) => ({ x: round(p.x), y: round(p.y) }))
		.sort((a, b) => a.x - b.x || a.y - b.y)
}

describe('Group2d construction', () => {
	it('is closed and unfilled and passes through the other options', () => {
		const g = new Group2d({
			children: [rectA()],
			isLabel: true,
			debugColor: 'red',
			excludeFromShapeBounds: true,
		})
		expect(g).toMatchObject({
			isClosed: true,
			isFilled: false,
			isLabel: true,
			debugColor: 'red',
			excludeFromShapeBounds: true,
		})
	})

	it('keeps the children in order', () => {
		const a = rectA()
		const b = rectB()
		const g = new Group2d({ children: [a, b] })
		expect(g.children).toEqual([a, b])
		expect(g.ignoredChildren).toEqual([])
	})

	it('flattens nested groups', () => {
		const a = rectA()
		const b = rectB()
		const c = label()
		const g = new Group2d({ children: [a, new Group2d({ children: [b, c] })] })
		expect(g.children).toEqual([a, b, c])
	})

	it('separates ignored children', () => {
		const a = rectA()
		const ignored = new Rectangle2d({ width: 10, height: 10, isFilled: true, ignore: true })
		const g = new Group2d({ children: [a, ignored] })
		expect(g.children).toEqual([a])
		expect(g.ignoredChildren).toEqual([ignored])
	})

	it('throws without any non-ignored children', () => {
		expect(() => new Group2d({ children: [] })).toThrow('Group2d must have at least one child')
		expect(
			() =>
				new Group2d({
					children: [new Rectangle2d({ width: 10, height: 10, isFilled: true, ignore: true })],
				})
		).toThrow('Group2d must have at least one child')
	})
})

describe('Group2d.getVertices', () => {
	it('concatenates the vertices of the children', () => {
		expect(group().vertices).toMatchObject([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 50 },
			{ x: 0, y: 50 },
			{ x: 200, y: 0 },
			{ x: 250, y: 0 },
			{ x: 250, y: 50 },
			{ x: 200, y: 50 },
		])
	})

	it('excludes labels by default but keeps internal geometry', () => {
		const g = new Group2d({ children: [rectA(), label(), internal()] })
		expect(g.vertices.length).toBe(8)
		expect(g.getVertices(Geometry2dFilters.EXCLUDE_LABELS).length).toBe(8)
		expect(g.getVertices(Geometry2dFilters.INCLUDE_ALL).length).toBe(12)
		expect(g.getVertices(Geometry2dFilters.EXCLUDE_INTERNAL).length).toBe(8)
		expect(g.getVertices(Geometry2dFilters.EXCLUDE_NON_STANDARD).length).toBe(4)
	})

	it('returns nothing when the group itself is excluded by the filter', () => {
		const g = new Group2d({ children: [rectA()], isLabel: true })
		expect(g.getVertices(Geometry2dFilters.EXCLUDE_LABELS)).toEqual([])
		expect(g.getVertices(Geometry2dFilters.INCLUDE_ALL).length).toBe(4)
	})

	it('ignores ignored children', () => {
		const ignored = new Rectangle2d({ x: 500, width: 10, height: 10, isFilled: true, ignore: true })
		const g = new Group2d({ children: [rectA(), ignored] })
		expect(g.getVertices(Geometry2dFilters.INCLUDE_ALL).length).toBe(4)
	})
})

describe('Group2d.bounds', () => {
	it('is the union of the children bounds', () => {
		expect(group().bounds).toMatchObject({ x: 0, y: 0, w: 250, h: 50 })
		expect(group().center).toMatchObject({ x: 125, y: 25 })
	})

	it('includes labels', () => {
		expect(groupWithLabel().bounds).toMatchObject({ x: 0, y: 0, w: 320, h: 50 })
	})
})

describe('Group2d.getLength', () => {
	it('sums the child lengths, excluding labels by default', () => {
		expect(group().length).toBe(500)
		expect(groupWithLabel().length).toBe(500)
		expect(groupWithLabel().getLength(Geometry2dFilters.INCLUDE_ALL)).toBe(580)
		expect(groupWithLabel().getLength(Geometry2dFilters.EXCLUDE_LABELS)).toBe(500)
	})
})

describe('Group2d.getArea', () => {
	it('uses the area of the first child', () => {
		expect(group().area).toBe(5000)
		expect(new Group2d({ children: [rectB(), rectA()] }).area).toBe(2500)
	})
})

describe('Group2d.nearestPoint', () => {
	it('returns the nearest point across the children, preferring earlier children on ties', () => {
		expect(group().nearestPoint(new Vec(190, 25))).toMatchObject({ x: 200, y: 25 })
		expect(group().nearestPoint(new Vec(50, -10))).toMatchObject({ x: 50, y: 0 })
		expect(group().nearestPoint(new Vec(150, 25))).toMatchObject({ x: 100, y: 25 })
	})

	it('respects the filters', () => {
		const g = groupWithLabel()
		expect(g.nearestPoint(new Vec(310, 30), Geometry2dFilters.INCLUDE_ALL)).toMatchObject({
			x: 310,
			y: 20,
		})
		expect(g.nearestPoint(new Vec(310, 30), Geometry2dFilters.EXCLUDE_LABELS)).toMatchObject({
			x: 250,
			y: 30,
		})
	})

	it('uses the label when no filters are given', () => {
		expect(groupWithLabel().nearestPoint(new Vec(310, 30))).toMatchObject({ x: 310, y: 20 })
	})
})

describe('Group2d.distanceToPoint', () => {
	it('is the smallest child distance, negative inside a filled child', () => {
		expect(group().distanceToPoint(new Vec(50, 25))).toBe(-25)
		expect(group().distanceToPoint(new Vec(225, 25))).toBe(25)
		expect(group().distanceToPoint(new Vec(225, 25), true)).toBe(-25)
		expect(group().distanceToPoint(new Vec(150, 25))).toBe(50)
	})

	it('respects the filters', () => {
		const g = groupWithLabel()
		expect(g.distanceToPoint(new Vec(310, 10), false, Geometry2dFilters.INCLUDE_ALL)).toBe(-10)
		expect(g.distanceToPoint(new Vec(310, 10), false, Geometry2dFilters.EXCLUDE_LABELS)).toBe(60)
	})
})

describe('Group2d.hitTestPoint', () => {
	it('hits when any child hits', () => {
		expect(group().hitTestPoint(new Vec(50, 25), 0, false)).toBe(true)
		expect(group().hitTestPoint(new Vec(225, 25), 0, false)).toBe(false)
		expect(group().hitTestPoint(new Vec(225, 25), 0, true)).toBe(true)
		expect(group().hitTestPoint(new Vec(150, 25), 0, true)).toBe(false)
		expect(group().hitTestPoint(new Vec(150, 25), 50, false)).toBe(true)
	})

	it('excludes labels by default', () => {
		const g = groupWithLabel()
		expect(g.hitTestPoint(new Vec(310, 10), 0, false)).toBe(false)
		expect(g.hitTestPoint(new Vec(310, 10), 0, false, Geometry2dFilters.INCLUDE_ALL)).toBe(true)
	})

	it('never hits ignored children', () => {
		const ignored = new Rectangle2d({ x: 500, width: 10, height: 10, isFilled: true, ignore: true })
		const g = new Group2d({ children: [rectA(), ignored] })
		expect(g.hitTestPoint(new Vec(505, 5), 0, true)).toBe(false)
	})
})

describe('Group2d.hitTestLineSegment', () => {
	it('hits when any child hits', () => {
		expect(group().hitTestLineSegment(new Vec(90, 25), new Vec(110, 25), 0)).toBe(true)
		expect(group().hitTestLineSegment(new Vec(240, 25), new Vec(260, 25), 0)).toBe(true)
		expect(group().hitTestLineSegment(new Vec(150, -10), new Vec(150, 60), 0)).toBe(false)
	})

	it('passes the distance to the children', () => {
		expect(group().hitTestLineSegment(new Vec(150, 0), new Vec(150, 50), 50)).toBe(true)
		expect(group().hitTestLineSegment(new Vec(150, 0), new Vec(150, 50), 49)).toBe(false)
	})

	it('excludes labels by default', () => {
		const g = groupWithLabel()
		expect(g.hitTestLineSegment(new Vec(310, -10), new Vec(310, 30), 0)).toBe(false)
		expect(
			g.hitTestLineSegment(new Vec(310, -10), new Vec(310, 30), 0, Geometry2dFilters.INCLUDE_ALL)
		).toBe(true)
	})
})

describe('Group2d.intersectLineSegment', () => {
	it('collects the intersections from every child', () => {
		const hits = group().intersectLineSegment(new Vec(-10, 25), new Vec(300, 25))
		expect(sortByX(hits)).toEqual([
			{ x: 0, y: 25 },
			{ x: 100, y: 25 },
			{ x: 200, y: 25 },
			{ x: 250, y: 25 },
		])
	})

	it('respects the filters', () => {
		const g = groupWithLabel()
		const A = new Vec(-10, 10)
		const B = new Vec(400, 10)
		expect(g.intersectLineSegment(A, B).length).toBe(6)
		expect(g.intersectLineSegment(A, B, Geometry2dFilters.EXCLUDE_LABELS).length).toBe(4)
	})

	it('returns an empty array when nothing is hit', () => {
		expect(group().intersectLineSegment(new Vec(150, -10), new Vec(150, 60))).toEqual([])
	})
})

describe('Group2d.intersectCircle', () => {
	it('collects the intersections from every child', () => {
		const hits = group().intersectCircle(new Vec(0, 25), 10)
		expect(sortByX(hits)).toEqual([
			{ x: 0, y: 15 },
			{ x: 0, y: 35 },
		])
	})

	it('respects the filters', () => {
		const g = groupWithLabel()
		expect(g.intersectCircle(new Vec(300, 10), 5).length).toBe(2)
		expect(g.intersectCircle(new Vec(300, 10), 5, Geometry2dFilters.EXCLUDE_LABELS)).toEqual([])
	})
})

describe('Group2d.intersectPolygon and intersectPolyline', () => {
	const polygon = [new Vec(50, -10), new Vec(110, -10), new Vec(110, 60), new Vec(50, 60)]

	it('collects polygon intersections from every child', () => {
		expect(sortByX(group().intersectPolygon(polygon))).toEqual([
			{ x: 50, y: 0 },
			{ x: 50, y: 50 },
		])
	})

	it('collects polyline intersections from every child', () => {
		const polyline = [new Vec(50, -10), new Vec(50, 60)]
		expect(sortByX(group().intersectPolyline(polyline))).toEqual([
			{ x: 50, y: 0 },
			{ x: 50, y: 50 },
		])
	})

	it('respects the filters', () => {
		const g = groupWithLabel()
		const labelPolygon = [new Vec(310, -10), new Vec(330, -10), new Vec(330, 30), new Vec(310, 30)]
		expect(g.intersectPolygon(labelPolygon).length).toBe(2)
		expect(g.intersectPolygon(labelPolygon, Geometry2dFilters.EXCLUDE_LABELS)).toEqual([])
		const labelPolyline = [new Vec(310, -10), new Vec(310, 30)]
		expect(g.intersectPolyline(labelPolyline).length).toBe(2)
		expect(g.intersectPolyline(labelPolyline, Geometry2dFilters.EXCLUDE_LABELS)).toEqual([])
	})
})

describe('Group2d.interpolateAlongEdge', () => {
	it('walks through the children in order', () => {
		const p = path()
		expect(p.interpolateAlongEdge(0)).toMatchObject({ x: 0, y: 0 })
		expect(p.interpolateAlongEdge(0.25)).toMatchObject({ x: 50, y: 0 })
		expect(p.interpolateAlongEdge(0.5)).toMatchObject({ x: 100, y: 0 })
		expect(p.interpolateAlongEdge(0.75)).toMatchObject({ x: 100, y: 50 })
		expect(p.interpolateAlongEdge(1)).toMatchObject({ x: 100, y: 100 })
	})

	it('clamps to the end of the last child', () => {
		expect(path().interpolateAlongEdge(1.5)).toMatchObject({ x: 100, y: 100 })
	})
})

describe('Group2d.uninterpolateAlongEdge', () => {
	it('is the inverse of interpolateAlongEdge', () => {
		const p = path()
		expect(p.uninterpolateAlongEdge(new Vec(0, 0))).toBe(0)
		expect(p.uninterpolateAlongEdge(new Vec(50, 0))).toBe(0.25)
		expect(p.uninterpolateAlongEdge(new Vec(100, 0))).toBe(0.5)
		expect(p.uninterpolateAlongEdge(new Vec(100, 50))).toBe(0.75)
		expect(p.uninterpolateAlongEdge(new Vec(100, 100))).toBe(1)
	})

	it('snaps points off the path to the nearest child', () => {
		expect(path().uninterpolateAlongEdge(new Vec(50, -20))).toBe(0.25)
		expect(path().uninterpolateAlongEdge(new Vec(120, 50))).toBe(0.75)
	})
})

describe('Group2d.transform', () => {
	it('transforms every child', () => {
		const t = group().transform(Mat.Translate(10, 20))
		expect(t).toBeInstanceOf(Group2d)
		expect((t as Group2d).children.every((c) => c instanceof TransformedGeometry2d)).toBe(true)
		expect(t.bounds).toMatchObject({ x: 10, y: 20, w: 250, h: 50 })
		expect(t.vertices[0]).toMatchObject({ x: 10, y: 20 })
		expect(t.vertices.length).toBe(8)
	})

	it('carries all the flags forward', () => {
		const g = new Group2d({
			children: [rectA()],
			isLabel: true,
			isEmptyLabel: true,
			isInternal: true,
			excludeFromShapeBounds: true,
			debugColor: 'red',
			ignore: true,
		})
		expect(g.transform(Mat.Identity())).toMatchObject({
			isLabel: true,
			isEmptyLabel: true,
			isInternal: true,
			excludeFromShapeBounds: true,
			debugColor: 'red',
			ignore: true,
		})
	})

	it('applies the transform options over the carried flags', () => {
		const g = new Group2d({ children: [rectA()], isLabel: true, isInternal: true })
		expect(
			g.transform(Mat.Identity(), {
				isLabel: false,
				isInternal: false,
				debugColor: 'red',
				ignore: true,
			})
		).toMatchObject({ isLabel: false, isInternal: false, debugColor: 'red', ignore: true })
	})

	it('scales hit testing with the transform', () => {
		const t = group().transform(Mat.Scale(2, 2))
		expect(t.hitTestPoint(new Vec(100, 50), 0, false)).toBe(true)
		expect(t.hitTestPoint(new Vec(300, 50), 0, false)).toBe(false)
		expect(t.distanceToPoint(new Vec(300, 50))).toBe(100)
	})

	// #10562: transform used to drop the ignored children.
	it('keeps the transformed ignored children', () => {
		const ignored = new Rectangle2d({ x: 500, width: 10, height: 10, isFilled: true, ignore: true })
		const g = new Group2d({ children: [rectA(), ignored] })
		const t = g.transform(Mat.Translate(10, 20)) as Group2d
		expect(t.children.length).toBe(1)
		expect(t.ignoredChildren.length).toBe(1)
		expect(t.ignoredChildren[0].ignore).toBe(true)
		expect(t.ignoredChildren[0].bounds).toMatchObject({ x: 510, y: 20, w: 10, h: 10 })
	})
})

describe('Group2d.overlapsPolygon', () => {
	it('overlaps when any child overlaps', () => {
		const aroundB = [new Vec(190, -10), new Vec(260, -10), new Vec(260, 60), new Vec(190, 60)]
		expect(group().overlapsPolygon(aroundB)).toBe(true)
		const gap = [new Vec(120, 10), new Vec(180, 10), new Vec(180, 40), new Vec(120, 40)]
		expect(group().overlapsPolygon(gap)).toBe(false)
	})
})

describe('Group2d svg output', () => {
	it('joins the children paths and skips labels', () => {
		expect(group().getSvgPathData()).toBe('M0,0 h100 v50 h-100z M200,0 h50 v50 h-50z')
		expect(groupWithLabel().getSvgPathData()).toBe('M0,0 h100 v50 h-100z  M200,0 h50 v50 h-50z')
	})

	it('draws the children plus a small corner mark at each bounds corner', () => {
		const g = new Group2d({
			children: [new Rectangle2d({ width: 128, height: 64, isFilled: true })],
		})
		expect(g.toSimpleSvgPath()).toBe(
			'M0,0L128,0L128,64L0,64Z' +
				'M0,4 L0,0 L4,0 ' +
				'M124,0 L128,0 L128,4 ' +
				'M128,60 L128,64 L124,64 ' +
				'M4,64 L0,64 L0,60 '
		)
	})
})
