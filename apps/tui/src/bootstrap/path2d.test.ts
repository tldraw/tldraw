import { describe, expect, it } from 'vitest'
import { Path2DPolyfill, installPath2D } from './path2d'

function opTypes(path: Path2DPolyfill) {
	return path.ops.map((op) => op.type)
}

function pointsOf(sub: number[]) {
	const pts: [number, number][] = []
	for (let i = 0; i < sub.length; i += 2) pts.push([sub[i], sub[i + 1]])
	return pts
}

function boundsOf(subpaths: number[][]) {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const sub of subpaths) {
		for (const [x, y] of pointsOf(sub)) {
			minX = Math.min(minX, x)
			maxX = Math.max(maxX, x)
			minY = Math.min(minY, y)
			maxY = Math.max(maxY, y)
		}
	}
	return { minX, minY, maxX, maxY }
}

describe('Path2DPolyfill svg parser', () => {
	it('parses PathBuilder output (M x y L … C … Z with spaces)', () => {
		const p = new Path2DPolyfill('M 10 20 L 30 40 C 1 2 3 4 5 6 Z')
		expect(p.ops).toEqual([
			{ type: 'move', x: 10, y: 20 },
			{ type: 'line', x: 30, y: 40 },
			{ type: 'cubic', x1: 1, y1: 2, x2: 3, y2: 4, x: 5, y: 6 },
			{ type: 'close' },
		])
	})

	it('parses compact getSvgPathFromPoints output (M1.2,3.4Q…T…Z) with T reflection', () => {
		const p = new Path2DPolyfill('M1.2,3.4Q5,6 7,8T9,10Z')
		expect(opTypes(p)).toEqual(['move', 'quad', 'quad', 'close'])
		const t = p.ops[2]
		// T reflects the previous control point (5,6) about the current point (7,8) → (9,10).
		expect(t).toEqual({ type: 'quad', x1: 9, y1: 10, x: 9, y: 10 })
	})

	it('handles implicit repeats, relative commands, H/V and numbers without separators', () => {
		const p = new Path2DPolyfill('m1 2 3 4h5v-6l-1.5.5')
		expect(p.ops).toEqual([
			{ type: 'move', x: 1, y: 2 },
			{ type: 'line', x: 4, y: 6 },
			{ type: 'line', x: 9, y: 6 },
			{ type: 'line', x: 9, y: 0 },
			{ type: 'line', x: 7.5, y: 0.5 },
		])
	})

	it('parses S with reflected control points and exponent numbers', () => {
		const p = new Path2DPolyfill('M0 0 C 1 1 2 1 3 0 S 5 -1 6 0 L1e1 2E-1')
		expect(opTypes(p)).toEqual(['move', 'cubic', 'cubic', 'line'])
		expect(p.ops[2]).toEqual({ type: 'cubic', x1: 4, y1: -1, x2: 5, y2: -1, x: 6, y: 0 })
		expect(p.ops[3]).toEqual({ type: 'line', x: 10, y: 0.2 })
	})

	it('converts relative arcs (dot arrowhead / scribble dot) into a circle', () => {
		// arrowheads.ts:97-99 and ScribbleOverlayUtil.ts:97 emit this shape.
		const r = 5
		const p = new Path2DPolyfill(`M ${0},${5} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`)
		expect(p.ops.filter((op) => op.type === 'cubic').length).toBeGreaterThanOrEqual(4)
		const subpaths = p.flatten(null, 0.05)
		expect(subpaths).toHaveLength(1)
		for (const [x, y] of pointsOf(subpaths[0])) {
			expect(Math.hypot(x - 5, y - 5)).toBeCloseTo(r, 3)
		}
		const b = boundsOf(subpaths)
		expect(b.minX).toBeCloseTo(0, 3)
		expect(b.maxX).toBeCloseTo(10, 3)
		expect(b.minY).toBeCloseTo(0, 3)
		expect(b.maxY).toBeCloseTo(10, 3)
	})

	it('parses absolute arcs with run-together flags and respects the sweep direction', () => {
		const cw = new Path2DPolyfill('M0 0A5 5 0 015 5')
		const ccw = new Path2DPolyfill('M0 0A5 5 0 005 5')
		const cwPts = pointsOf(cw.flatten(null, 0.05)[0])
		const ccwPts = pointsOf(ccw.flatten(null, 0.05)[0])
		const mid = (pts: [number, number][]) => pts[Math.floor(pts.length / 2)]
		// Both arcs end at (5,5); the sweep flag picks which side of the chord the arc bulges to.
		expect(cwPts[cwPts.length - 1][0]).toBeCloseTo(5, 3)
		expect(cwPts[cwPts.length - 1][1]).toBeCloseTo(5, 3)
		expect(mid(cw)[0] - mid(cw)[1]).toBeGreaterThan(0.5)
		expect(mid(ccw)[0] - mid(ccw)[1]).toBeLessThan(-0.5)
	})

	it('stops at malformed data without throwing', () => {
		expect(() => new Path2DPolyfill('M 1')).not.toThrow()
		expect(() => new Path2DPolyfill('garbage')).not.toThrow()
		expect(new Path2DPolyfill('').isEmpty()).toBe(true)
	})
})

describe('Path2DPolyfill canvas methods', () => {
	it('rect emits a closed subpath and leaves a fresh subpath at (x, y)', () => {
		const p = new Path2DPolyfill()
		p.rect(1, 2, 3, 4)
		expect(opTypes(p)).toEqual(['move', 'line', 'line', 'line', 'close', 'move'])
		const subpaths = p.flatten()
		expect(subpaths).toHaveLength(1)
		expect(subpaths[0]).toEqual([1, 2, 4, 2, 4, 6, 1, 6, 1, 2])
	})

	it('roundRect rounds the corners and clamps oversized radii', () => {
		const p = new Path2DPolyfill()
		p.roundRect(0, 0, 10, 10, 2)
		const b = boundsOf(p.flatten(null, 0.05))
		expect(b).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 })
		// The corner itself is cut off.
		const pts = pointsOf(p.flatten(null, 0.05)[0])
		expect(pts.some(([x, y]) => x < 0.5 && y < 0.5)).toBe(false)
		const clamped = new Path2DPolyfill()
		clamped.roundRect(0, 0, 10, 10, 50)
		const cb = boundsOf(clamped.flatten(null, 0.05))
		expect(cb.maxX).toBeCloseTo(10, 3)
		expect(cb.maxY).toBeCloseTo(10, 3)
	})

	it('arc joins from the current point and closes a full circle', () => {
		const p = new Path2DPolyfill()
		p.moveTo(0, 0)
		p.arc(10, 0, 2, 0, Math.PI * 2)
		expect(p.ops[1]).toEqual({ type: 'line', x: 12, y: 0 })
		const sub = p.flatten(null, 0.05)[0]
		const pts = pointsOf(sub)
		expect(pts[0]).toEqual([0, 0])
		const last = pts[pts.length - 1]
		expect(last[0]).toBeCloseTo(12, 6)
		expect(last[1]).toBeCloseTo(0, 6)
	})

	it('arc without a current point starts at the arc start and honours counterclockwise', () => {
		const p = new Path2DPolyfill()
		p.arc(0, 0, 1, 0, Math.PI / 2, true)
		expect(p.ops[0]).toEqual({ type: 'move', x: 1, y: 0 })
		const pts = pointsOf(p.flatten(null, 0.01)[0])
		// Counterclockwise from 0 to π/2 is the long way round (3/4 of the circle): passes (-1, 0).
		expect(pts.some(([x, y]) => Math.abs(x + 1) < 0.02 && Math.abs(y) < 0.1)).toBe(true)
	})

	it('arcTo inserts the tangent points of the rounded corner (ArrowShapeUtil label cutout)', () => {
		const p = new Path2DPolyfill()
		p.moveTo(0, 0)
		p.arcTo(10, 0, 10, 10, 2)
		expect(p.ops[1]).toEqual({ type: 'line', x: 8, y: 0 })
		const pts = pointsOf(p.flatten(null, 0.01)[0])
		const last = pts[pts.length - 1]
		expect(last[0]).toBeCloseTo(10, 4)
		expect(last[1]).toBeCloseTo(2, 4)
		// Every arc point is 2 away from the corner centre (8, 2).
		for (const [x, y] of pts.slice(2)) expect(Math.hypot(x - 8, y - 2)).toBeCloseTo(2, 3)
	})

	it('ellipse flattens to the right bounds', () => {
		const p = new Path2DPolyfill()
		p.ellipse(5, 5, 4, 2, 0, 0, Math.PI * 2)
		const b = boundsOf(p.flatten(null, 0.01))
		expect(b.minX).toBeCloseTo(1, 2)
		expect(b.maxX).toBeCloseTo(9, 2)
		expect(b.minY).toBeCloseTo(3, 2)
		expect(b.maxY).toBeCloseTo(7, 2)
	})

	it('addPath with a Mat-like transform appends transformed ops (strokeShapeIndicators batching)', () => {
		const shape = new Path2DPolyfill('M0 0 L10 0 Q10 5 10 10 Z')
		const batched = new Path2DPolyfill()
		batched.addPath(shape, { a: 2, b: 0, c: 0, d: 2, e: 100, f: 50 })
		expect(batched.ops).toEqual([
			{ type: 'move', x: 100, y: 50 },
			{ type: 'line', x: 120, y: 50 },
			{ type: 'quad', x1: 120, y1: 60, x: 120, y: 70 },
			{ type: 'close' },
		])
		// A rotation uses b and c.
		const rotated = new Path2DPolyfill()
		rotated.addPath(new Path2DPolyfill('M1 0'), { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 })
		expect(rotated.ops[0]).toEqual({ type: 'move', x: 0, y: 1 })
		// Copy constructor and addPath without a matrix keep the ops as they are.
		expect(new Path2DPolyfill(shape).ops).toEqual(shape.ops)
	})
})

describe('Path2DPolyfill.flatten', () => {
	it('applies the transform and marks closed subpaths by repeating the first point', () => {
		const p = new Path2DPolyfill('M0 0 L1 0 L1 1 Z M5 5 L6 6')
		const subs = p.flatten({ a: 10, b: 0, c: 0, d: 10, e: 0, f: 0 })
		expect(subs).toEqual([
			[0, 0, 10, 0, 10, 10, 0, 0],
			[50, 50, 60, 60],
		])
	})

	it('subdivides curves adaptively: a quarter arc of radius 4 gets at least 8 segments', () => {
		const p = new Path2DPolyfill()
		p.arc(0, 0, 4, 0, Math.PI / 2)
		const sub = p.flatten(null, 0.25)[0]
		const segments = sub.length / 2 - 1
		expect(segments).toBeGreaterThanOrEqual(8)
		// Coarser tolerance → fewer points, but never fewer than one segment per curve.
		const coarse = p.flatten(null, 100)[0]
		expect(coarse.length / 2 - 1).toBeGreaterThanOrEqual(1)
		expect(coarse.length).toBeLessThan(sub.length)
	})

	it('drops single-point subpaths and a lineTo after closePath starts from the subpath start', () => {
		const p = new Path2DPolyfill()
		p.moveTo(0, 0)
		p.lineTo(4, 0)
		p.closePath()
		p.lineTo(0, 4)
		p.moveTo(9, 9)
		const subs = p.flatten()
		expect(subs).toEqual([
			[0, 0, 4, 0, 0, 0],
			[0, 0, 0, 4],
		])
	})

	it('getBounds reports the flattened extent', () => {
		expect(new Path2DPolyfill('M1 2 L5 8').getBounds()).toEqual({ minX: 1, minY: 2, maxX: 5, maxY: 8 })
		expect(new Path2DPolyfill().getBounds()).toBeNull()
	})
})

describe('installPath2D', () => {
	it('is already installed by the test setup as the same class on globalThis and window', () => {
		expect(globalThis.Path2D).toBe(Path2DPolyfill)
		expect(window.Path2D).toBe(Path2DPolyfill)
		expect(new Path2D('M0 0 L1 1')).toBeInstanceOf(Path2DPolyfill)
	})

	it('installs on a plain object as window', () => {
		const fake = {} as unknown as Window
		installPath2D(fake)
		expect((fake as unknown as { Path2D: unknown }).Path2D).toBe(Path2DPolyfill)
	})
})
