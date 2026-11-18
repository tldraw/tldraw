import {
	Box,
	Circle2d,
	Geometry2d,
	Group2d,
	TLArrowShape,
	TLGeoShape,
	TLShapeId,
	Vec,
	VecLike,
	b64Vecs,
	createShapeId,
	toRichText,
} from '@tldraw/editor'
import { getElbowArrowInfo } from '../lib/shapes/arrow/elbow/getElbowArrowInfo'
import { getArrowInfo } from '../lib/shapes/arrow/getArrowInfo'
import { getArrowBindings } from '../lib/shapes/arrow/shared'
import { LineShapeUtil } from '../lib/shapes/line/LineShapeUtil'
import { TestEditor } from './TestEditor'

// Stroke widths are the theme's 2 * the size multiplier, so the ink reaches half that past the
// geometry: s 1, m 1.75, l 2.5, xl 5. The default hit test margin is 4.5 screen px.

let editor: TestEditor

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	arrow: createShapeId('arrow'),
}

beforeEach(() => {
	editor = new TestEditor()
})

function zoomTo400() {
	editor.setCamera({ x: 0, y: 0, z: 4 })
	// hover waits for the camera to stop
	vi.advanceTimersByTime(500)
}

function screen(x: number, y: number) {
	return editor.pageToScreen({ x, y })
}

function hover(x: number, y: number) {
	const p = screen(x, y)
	editor.pointerMove(p.x, p.y)
	return editor.getHoveredShapeId()
}

function click(x: number, y: number) {
	editor.selectNone()
	const p = screen(x, y)
	editor.pointerMove(p.x, p.y).pointerDown(p.x, p.y).pointerUp(p.x, p.y)
	// don't let the next click land as a double click
	vi.advanceTimersByTime(1000)
	return editor.getOnlySelectedShapeId()
}

function hit(x: number, y: number) {
	return (
		editor.getShapeAtPoint(
			{ x, y },
			{ hitInside: false, margin: editor.getHitTestMargin(), renderingOnly: true }
		)?.id ?? null
	)
}

function drag(tool: 'eraser' | 'scribble' | 'brush', points: VecLike[]) {
	editor.setCurrentTool(tool === 'eraser' ? 'eraser' : 'select')
	const [first, ...rest] = points.map((p) => screen(p.x, p.y))
	editor.pointerMove(first.x, first.y)
	if (tool === 'scribble') editor.keyDown('Alt')
	editor.pointerDown(first.x, first.y)
	for (const p of rest) editor.pointerMove(p.x, p.y)
}

function geo(id: TLShapeId, props: Partial<TLGeoShape['props']>, x = 100, y = 100) {
	editor.createShape({
		id,
		type: 'geo',
		x,
		y,
		props: { w: 200, h: 200, fill: 'none', size: 'xl', ...props },
	})
}

function line(id: TLShapeId, y: number, size: 's' | 'm' | 'xl', rise = 0) {
	editor.createShape({
		id,
		type: 'line',
		x: 100,
		y,
		props: {
			size,
			points: {
				a1: { id: 'a1', index: 'a1' as any, x: 0, y: 0 },
				a2: { id: 'a2', index: 'a2' as any, x: 200, y: rise },
			},
		},
	})
}

// Points at `r` from the arc's centre, through the middle of a curved arrow at (100, 100)
function arcProbe(id: TLShapeId) {
	const info = getArrowInfo(editor, editor.getShape<TLArrowShape>(id)!)!
	if (info.type !== 'arc') throw Error('expected a curved arrow')
	// the body geometry is an arc about the handle arc's centre
	const { center, radius } = info.handleArc
	const dir = Vec.Sub(info.middle, center).uni()
	const page = (r: number, turn = 0) =>
		Vec.Add({ x: 100, y: 100 }, Vec.Add(center, Vec.Rot(dir, turn).mul(r)))
	return { page, radius, center }
}

describe('xl arrow shaft at 400% (#11567, #10855)', () => {
	beforeEach(() => {
		editor.createShape({
			id: ids.arrow,
			type: 'arrow',
			x: 100,
			y: 100,
			props: { size: 'xl', dash: 'solid', start: { x: 0, y: 0 }, end: { x: 200, y: 0 } },
		})
		editor.selectNone()
		zoomTo400()
	})

	// The ink is 5 page units (20 screen px) either side of the shaft; one screen px is 0.25
	it.each([
		['above', 95, 94.75],
		['below', 105, 105.25],
	])('hovers and clicks up to the ink edge %s the shaft', (_side, lastOnInk, firstPast) => {
		expect(hover(200, lastOnInk)).toBe(ids.arrow)
		expect(hover(200, firstPast)).toBe(null)
		expect(click(200, lastOnInk)).toBe(ids.arrow)
		expect(click(200, firstPast)).toBe(null)
	})
})

describe('geo stroke reach', () => {
	it('reaches the ink edge of an xl stroke at 100%, both sides', () => {
		geo(ids.a, {})
		expect(hover(95, 200)).toBe(ids.a)
		expect(hover(105, 200)).toBe(ids.a)
		expect(hover(94.5, 200)).toBe(null)
		expect(hover(105.5, 200)).toBe(null)
	})

	it('keeps the 4.5 margin for an s stroke at 100%', () => {
		geo(ids.a, { size: 's' })
		expect(hover(95.5, 200)).toBe(ids.a)
		expect(hover(104.5, 200)).toBe(ids.a)
		expect(hover(95.25, 200)).toBe(null)
		expect(hover(104.75, 200)).toBe(null)
	})

	it('reaches the ink at 400%, with no margin on top', () => {
		geo(ids.a, {})
		zoomTo400()
		// 4.5 off the centre line is past the 1.125 margin, but on the ink
		expect(hover(95.5, 200)).toBe(ids.a)
		expect(hover(104.5, 200)).toBe(ids.a)
		// 0.5 past the ink edge
		expect(hover(94.5, 200)).toBe(null)
		expect(hover(105.5, 200)).toBe(null)
	})

	it('doubles the padding for a rotated shape at scale 2', () => {
		geo(ids.a, { w: 400, h: 200, scale: 2 })
		editor.rotateShapesBy([ids.a], Math.PI / 2)
		zoomTo400()
		expect(editor.getShapeGeometry(ids.a).hitPadding).toBe(10)
		const { minX, center } = editor.getShapePageBounds(ids.a)!
		expect(hover(minX - 9.75, center.y)).toBe(ids.a)
		expect(hover(minX + 9.75, center.y)).toBe(ids.a)
		expect(hover(minX - 10.5, center.y)).toBe(null)
		expect(hover(minX + 10.5, center.y)).toBe(null)
	})
})

describe('ink edge of other stroked shapes at 400%', () => {
	beforeEach(() => {
		zoomTo400()
	})

	it('line', () => {
		line(ids.a, 100, 'xl')
		expect(hit(200, 95)).toBe(ids.a)
		expect(hit(200, 105)).toBe(ids.a)
		expect(hit(200, 105.5)).toBe(null)
	})

	it('straight arrow', () => {
		editor.createShape({
			id: ids.a,
			type: 'arrow',
			x: 100,
			y: 100,
			props: { size: 'xl', start: { x: 0, y: 0 }, end: { x: 200, y: 0 } },
		})
		expect(hit(200, 105)).toBe(ids.a)
		expect(hit(200, 105.5)).toBe(null)
	})

	it('curved arrow', () => {
		editor.createShape({
			id: ids.a,
			type: 'arrow',
			x: 100,
			y: 100,
			props: { size: 'xl', start: { x: 0, y: 0 }, end: { x: 200, y: 0 }, bend: 60 },
		})
		const { page, radius } = arcProbe(ids.a)
		const outer = page(radius + 4.95)
		const inner = page(radius - 4.95)
		const past = page(radius + 5.5)
		expect(hit(outer.x, outer.y)).toBe(ids.a)
		expect(hit(inner.x, inner.y)).toBe(ids.a)
		expect(hit(past.x, past.y)).toBe(null)
	})

	it('elbow arrow', () => {
		editor.createShape({
			id: ids.a,
			type: 'arrow',
			x: 100,
			y: 100,
			props: { size: 'xl', kind: 'elbow', start: { x: 0, y: 0 }, end: { x: 200, y: 200 } },
		})
		const { vertices } = (editor.getShapeGeometry(ids.a) as Group2d).children[0]
		let [p, q] = [vertices[0], vertices[1]]
		for (let i = 1; i < vertices.length - 1; i++) {
			if (Vec.Dist(vertices[i], vertices[i + 1]) > Vec.Dist(p, q)) {
				;[p, q] = [vertices[i], vertices[i + 1]]
			}
		}
		const mid = Vec.Add({ x: 100, y: 100 }, Vec.Med(p, q))
		const normal = Vec.Sub(q, p).uni().per()
		const at = (d: number) => Vec.Add(mid, Vec.Mul(normal, d))
		expect(hit(at(5).x, at(5).y)).toBe(ids.a)
		expect(hit(at(-5).x, at(-5).y)).toBe(ids.a)
		expect(hit(at(5.5).x, at(5.5).y)).toBe(null)
	})

	function draw(isClosed: boolean) {
		const points = isClosed
			? [
					{ x: 0, y: 0, z: 0.5 },
					{ x: 100, y: 0, z: 0.5 },
					{ x: 200, y: 0, z: 0.5 },
					{ x: 200, y: 200, z: 0.5 },
					{ x: 0, y: 200, z: 0.5 },
					{ x: 0, y: 0, z: 0.5 },
				]
			: [
					{ x: 0, y: 0, z: 0.5 },
					{ x: 100, y: 0, z: 0.5 },
					{ x: 200, y: 0, z: 0.5 },
				]
		editor.createShape({
			id: ids.a,
			type: 'draw',
			x: 100,
			y: 100,
			props: {
				size: 'xl',
				isClosed,
				isComplete: true,
				segments: [{ type: 'free', path: b64Vecs.encodePoints(points) }],
			},
		})
	}

	// From the stroke's nearest point towards `toward`, in page space
	function inkProbe(geometry: Geometry2d, toward: VecLike) {
		const local = Vec.Sub(toward, { x: 100, y: 100 })
		const nearest = geometry.nearestPoint(local)
		const dir = Vec.Sub(local, nearest).uni()
		return (d: number) => Vec.Add({ x: 100, y: 100 }, Vec.Add(nearest, Vec.Mul(dir, d)))
	}

	// draw strokes render (strokeWidth + 1) wide: 11 for xl, so the ink reaches 5.5
	it.each([
		['open', false],
		['closed', true],
	])('%s draw', (_kind, isClosed) => {
		draw(isClosed)
		const geometry = editor.getShapeGeometry(ids.a)
		expect(geometry.isClosed).toBe(isClosed)
		expect(geometry.hitPadding).toBe(5.5)
		for (const toward of [
			{ x: 150, y: 50 },
			{ x: 150, y: 150 },
		]) {
			const at = inkProbe(geometry, toward)
			expect(hit(at(5.4).x, at(5.4).y)).toBe(ids.a)
			expect(hit(at(6).x, at(6).y)).toBe(null)
		}
	})
})

describe('labels', () => {
	beforeEach(() => {
		zoomTo400()
	})

	it('hits a geo label only inside its box', () => {
		geo(ids.a, { w: 400, h: 400, richText: toRichText('hello') })
		const label = (editor.getShapeGeometry(ids.a) as Group2d).children.find((c) => c.isLabel)!
		expect(label.hitPadding).toBe(0)
		const { minY, center } = label.bounds
		// the label spans the shape's width; its top edge is far from the stroke
		expect(minY).toBeGreaterThan(100)
		expect(hit(100 + center.x, 100 + minY + 0.25)).toBe(ids.a)
		expect(hit(100 + center.x, 100 + minY - 0.5)).toBe(null)
	})

	it('hits an arrow label only inside its box', () => {
		editor.createShape({
			id: ids.a,
			type: 'arrow',
			x: 100,
			y: 100,
			props: {
				size: 'xl',
				start: { x: 0, y: 0 },
				end: { x: 400, y: 0 },
				richText: toRichText('hello'),
			},
		})
		const label = (editor.getShapeGeometry(ids.a) as Group2d).children.find((c) => c.isLabel)!
		expect(label.hitPadding).toBe(0)
		const { minY, center } = label.bounds
		// above the shaft's ink, at the label's top edge
		expect(minY).toBeLessThan(-6)
		expect(hit(100 + center.x, 100 + minY + 0.25)).toBe(ids.a)
		expect(hit(100 + center.x, 100 + minY - 0.5)).toBe(null)
	})
})

describe('overlapping shapes', () => {
	it('picks the line whose ink the pointer is on over a thinner one in reach, in both orders', () => {
		// thin ink 99..101, thick ink 99..109; the pointer is 1.5 from the thin centre line
		for (const thinOnTop of [true, false]) {
			editor.deleteShapes([ids.a, ids.b])
			if (thinOnTop) {
				line(ids.b, 104, 'xl')
				line(ids.a, 100, 's')
			} else {
				line(ids.a, 100, 's')
				line(ids.b, 104, 'xl')
			}
			expect(hit(200, 101.5)).toBe(ids.b)
		}
	})

	it('picks the top shape where the pointer is on both inks, in both orders', () => {
		zoomTo400()
		// the pointer is 1 from a's left edge and 2 from b's: on both inks
		for (const aOnTop of [true, false]) {
			editor.deleteShapes([ids.a, ids.b])
			if (aOnTop) {
				geo(ids.b, {}, 103)
				geo(ids.a, {}, 100)
			} else {
				geo(ids.a, {}, 100)
				geo(ids.b, {}, 103)
			}
			expect(hit(101, 200)).toBe(aOnTop ? ids.a : ids.b)
		}
	})

	it('picks the closest edge among thin strokes at 100%, as without padding', () => {
		// 2 from s's edge (1 past its ink) and 3 from l's edge (0.5 past its ink): the raw distance
		// picks s, a distance-to-ink ranking would pick l
		for (const sOnTop of [true, false]) {
			editor.deleteShapes([ids.a, ids.b])
			if (sOnTop) {
				geo(ids.b, { size: 'l' }, 105)
				geo(ids.a, { size: 's' }, 100)
			} else {
				geo(ids.a, { size: 's' }, 100)
				geo(ids.b, { size: 'l' }, 105)
			}
			expect(hit(102, 200)).toBe(ids.a)
		}
	})

	// An xl line along a frame's top edge, behind it: only outside the edge may its ink win
	it.each([
		['inside', 102, ids.b],
		['outside', 98, ids.a],
	])("keeps the frame body over ink below it, from just %s the frame's edge", (_, y, id) => {
		line(ids.a, 100, 'xl')
		editor.createShape({ id: ids.b, type: 'frame', x: 100, y: 100, props: { w: 200, h: 200 } })
		expect(hit(200, y)).toBe(id)
	})

	it('does not reach ink through a filled shape that contains the pointer', () => {
		zoomTo400()
		geo(ids.a, {})
		geo(ids.b, { size: 's', fill: 'solid', w: 50, h: 50 }, 90, 175)
		// on a's ink, inside b
		expect(hit(97, 200)).toBe(ids.b)
	})
})

describe('candidate lookup', () => {
	beforeEach(() => {
		zoomTo400()
	})

	it('clicks the outer ink edge outside the page bounds', () => {
		geo(ids.a, {})
		expect(editor.getShapePageBounds(ids.a)!.minX).toBe(100)
		expect(click(95.5, 200)).toBe(ids.a)
	})

	it('indexes a group geometry at its widest child padding', () => {
		geo(ids.a, {})
		const geometry = editor.getShapeGeometry(ids.a)
		expect(geometry).toBeInstanceOf(Group2d)
		expect(geometry.hitPadding).toBe(5)
		expect(editor.getShapeIdsInsideBounds(new Box(95.1, 200, 0.5, 0.5)).has(ids.a)).toBe(true)
		expect(editor.getShapeIdsInsideBounds(new Box(92.4, 200, 0.5, 0.5)).has(ids.a)).toBe(false)
	})

	it('indexes the outer ink at the extremum of a rotated curved arrow', () => {
		editor.createShape({
			id: ids.a,
			type: 'arrow',
			x: 100,
			y: 100,
			rotation: Math.PI / 6,
			props: { size: 'xl', start: { x: 0, y: 0 }, end: { x: 200, y: 0 }, bend: 60 },
		})
		const { center, radius } = arcProbe(ids.a)
		const bottom = Vec.Add(editor.getShapePageTransform(ids.a).applyToPoint(center), {
			x: 0,
			y: radius + 4.9,
		})
		expect(editor.isPointInShape(ids.a, bottom)).toBe(true)
		expect(editor.getShapesAtPoint(bottom).map((s) => s.id)).toEqual([ids.a])
	})

	// xl lines are 20 wide (ink 10 either side) after either change
	it.each([
		['theme', () => editor.updateTheme({ ...editor.getTheme('default')!, strokeWidth: 4 })],
		['color mode', () => editor.setColorMode('dark')],
	])('follows a %s change that widens the stroke without touching the shape', (_, widen) => {
		editor = new TestEditor({
			shapeUtils: [
				LineShapeUtil.configure({
					getCustomDisplayValues: (_editor, _shape, _theme, colorMode) =>
						colorMode === 'dark' ? { strokeWidth: 20 } : {},
				}),
			],
		})
		editor.setColorMode('light')
		line(ids.a, 100, 'xl')
		expect(editor.getShapesAtPoint({ x: 200, y: 108 })).toEqual([])
		widen()
		expect(editor.getShapesAtPoint({ x: 200, y: 108 }).map((s) => s.id)).toEqual([ids.a])
	})
})

describe('drag-line hit tests at 400%', () => {
	beforeEach(() => {
		zoomTo400()
		// a long top edge from (100, 100) to (500, 100)
		geo(ids.a, { w: 400 })
	})

	// Between the edge's vertices, on its outer ink: the vertices are far away
	const alongTopInk = [
		{ x: 200, y: 80 },
		{ x: 250, y: 96 },
		{ x: 400, y: 96 },
	]

	it('erases along the outer ink of a long edge', () => {
		drag('eraser', alongTopInk)
		expect(editor.getErasingShapeIds()).toEqual([ids.a])
	})

	it('scribble selects along the outer ink of a long edge', () => {
		drag('scribble', alongTopInk)
		editor.expectToBeIn('select.scribble_brushing')
		expect(editor.getSelectedShapeIds()).toEqual([ids.a])
	})

	it('does not erase from 24px away: the reach is the ink, not ink plus margin', () => {
		drag('eraser', [
			{ x: 200, y: 80 },
			{ x: 250, y: 94 },
			{ x: 400, y: 94 },
		])
		expect(editor.getErasingShapeIds()).toEqual([])
	})

	it('box selects when the brush edge is on the outer ink', () => {
		drag('brush', [
			{ x: 200, y: 60 },
			{ x: 300, y: 96 },
		])
		editor.expectToBeIn('select.brushing')
		expect(editor.getSelectedShapeIds()).toEqual([ids.a])
		editor.pointerMove(screen(300, 94.5).x, screen(300, 94.5).y)
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('erases along the outer ink of a curved arrow', () => {
		editor.deleteShapes([ids.a])
		editor.createShape({
			id: ids.arrow,
			type: 'arrow',
			x: 100,
			y: 100,
			props: { size: 'xl', start: { x: 0, y: 0 }, end: { x: 400, y: 0 }, bend: 100 },
		})
		const { page, radius } = arcProbe(ids.arrow)
		drag('eraser', [page(radius + 20), page(radius + 4), page(radius + 4, 0.05)])
		expect(editor.getErasingShapeIds()).toEqual([ids.arrow])
	})
})

describe('Circle2d band', () => {
	// centre (50, 50), radius 50, ink 45..55
	const circle = () => new Circle2d({ radius: 50, isFilled: false, hitPadding: 5 })

	it('hits a short drag lying wholly inside the stroke band', () => {
		expect(circle().hitTestLineSegment({ x: 102, y: 50 }, { x: 102, y: 51 })).toBe(true)
	})

	it('hits a drag tangent to the outer ink edge, and misses just beyond it', () => {
		expect(circle().hitTestLineSegment({ x: 0, y: -5 }, { x: 100, y: -5 })).toBe(true)
		expect(circle().hitTestLineSegment({ x: 0, y: -5.5 }, { x: 100, y: -5.5 })).toBe(false)
	})

	it('misses a drag inside the hole', () => {
		expect(circle().hitTestLineSegment({ x: 40, y: 50 }, { x: 60, y: 50 })).toBe(false)
	})

	it('reaches max(distance, padding), not the sum', () => {
		expect(circle().hitTestLineSegment({ x: 0, y: -6 }, { x: 100, y: -6 }, 1.125)).toBe(false)
		expect(circle().hitTestLineSegment({ x: 0, y: -6 }, { x: 100, y: -6 }, 6)).toBe(true)
	})
})

describe('exact-outline callers', () => {
	it('routes an elbow arrow between xl targets as without padding', () => {
		geo(ids.a, {}, 0, 0)
		geo(ids.b, { geo: 'ellipse' }, 400, 300)
		editor.createShape({
			id: ids.arrow,
			type: 'arrow',
			props: {
				kind: 'elbow',
				size: 'xl',
				arrowheadStart: 'none',
				arrowheadEnd: 'none',
				start: { x: 0, y: 0 },
				end: { x: 0, y: 0 },
			},
		})
		// 3 outside a 200 circle at 30°: on the ellipse's ink, outside its outline
		const anchor = {
			x: (100 + 103 * Math.cos(Math.PI / 6)) / 200,
			y: (100 + 103 * Math.sin(Math.PI / 6)) / 200,
		}
		for (const [terminal, toId] of [
			['start', ids.a],
			['end', ids.b],
		] as const) {
			editor.createBinding({
				type: 'arrow',
				fromId: ids.arrow,
				toId,
				props: {
					terminal,
					isExact: false,
					isPrecise: true,
					normalizedAnchor: anchor,
					snap: 'none',
				},
			})
		}
		const arrow = editor.getShape<TLArrowShape>(ids.arrow)!
		const info = getElbowArrowInfo(editor, arrow, getArrowBindings(editor, arrow))
		expect(info.route?.points.map((p) => [p.x, p.y])).toMatchInlineSnapshot(`
			[
			  [
			    200,
			    151.5,
			  ],
			  [
			    666,
			    151.5,
			  ],
			  [
			    666,
			    451.5,
			  ],
			  [
			    600,
			    451.5,
			  ],
			]
		`)
	})

	it('re-snaps an anchor that lands on the ink but outside the new outline', () => {
		geo(ids.a, {}, 0, 0)
		editor.createShape({
			id: ids.arrow,
			type: 'arrow',
			x: 400,
			y: 0,
			props: { size: 'xl', start: { x: 0, y: 0 }, end: { x: -200, y: 0 } },
		})
		// 3 outside a 200 circle at 45°: inside the rectangle, on the circle's ink
		const r = 103 / Math.SQRT2
		const anchor = { x: (100 + r) / 200, y: (100 - r) / 200 }
		editor.createBinding({
			type: 'arrow',
			fromId: ids.arrow,
			toId: ids.a,
			props: {
				terminal: 'end',
				isExact: false,
				isPrecise: true,
				normalizedAnchor: anchor,
				snap: 'none',
			},
		})
		editor.updateShape({ id: ids.a, type: 'geo', props: { geo: 'ellipse' } })
		const end = getArrowBindings(editor, editor.getShape<TLArrowShape>(ids.arrow)!).end!
		expect(end.props.normalizedAnchor).not.toEqual(anchor)
		expect(end.props.normalizedAnchor).toMatchInlineSnapshot(`
			{
			  "x": 0.8535533905932737,
			  "y": 0.14644660940672616,
			}
		`)
	})
})

describe('review follow-ups', () => {
	it('gives dash none no stroke padding: no ink, no reach past the fill', () => {
		geo(ids.a, { dash: 'none', fill: 'solid' })
		zoomTo400()
		// solid xl would hit up to 5 units out; with no stroke drawn only the margin applies
		expect(hit(96, 200)).toBe(null)
		expect(hit(99.5, 200)).toBe(ids.a)
	})

	it('does not let an invisible dash none stroke win an overlap', () => {
		line(ids.b, 103, 's')
		geo(ids.a, { dash: 'none', fill: 'solid' }, 100, 106)
		zoomTo400()
		// the pointer is on the thin line, 3 units above the borderless shape
		expect(hit(200, 103)).toBe(ids.b)
	})

	it('keeps the zero-margin fallback for a flat line with default options', () => {
		line(ids.a, 100, 'm')
		// no options: outerMargin 0, but a flat line still hits within the hit test margin
		expect(editor.getShapeAtPoint({ x: 200, y: 97 })?.id).toBe(ids.a)
		expect(editor.getShapeAtPoint({ x: 200, y: 94 })?.id).toBe(undefined)
	})

	it('picks a stroke anywhere on its ink with default options', () => {
		line(ids.a, 100, 'm', 200)
		// on the round cap, outside the line's bounds
		expect(editor.isPointInShape(ids.a, { x: 99, y: 99 })).toBe(true)
		expect(editor.getShapeAtPoint({ x: 99, y: 99 })?.id).toBe(ids.a)
	})
})
