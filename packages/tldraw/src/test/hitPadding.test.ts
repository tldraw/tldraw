import {
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
	// A geo's left edge is at x = 100; hits reach `lastHit` either side of it and miss at `firstMiss`
	it.each([
		['xl at 100%: the ink, past the margin', 'xl', 1, 5, 5.5],
		['s at 100%: the margin, past the ink', 's', 1, 4.5, 4.75],
		['xl at 400%: the ink, with no margin on top', 'xl', 4, 5, 5.5],
	] as const)('reaches %s', (_, size, zoom, lastHit, firstMiss) => {
		geo(ids.a, { size })
		if (zoom === 4) zoomTo400()
		for (const side of [-1, 1]) {
			expect(hover(100 + side * lastHit, 200)).toBe(ids.a)
			expect(hover(100 + side * firstMiss, 200)).toBe(null)
		}
	})

	it('doubles the padding for a rotated shape at scale 2', () => {
		geo(ids.a, { w: 400, h: 200, scale: 2 })
		editor.rotateShapesBy([ids.a], Math.PI / 2)
		zoomTo400()
		const { minX, center } = editor.getShapePageBounds(ids.a)!
		expect(hover(minX - 9.75, center.y)).toBe(ids.a)
		expect(hover(minX + 9.75, center.y)).toBe(ids.a)
		expect(hover(minX - 10.5, center.y)).toBe(null)
		expect(hover(minX + 10.5, center.y)).toBe(null)
	})

	it('gives dash none no padding: no reach past the fill, and no invisible ink to win with', () => {
		line(ids.b, 103, 's')
		geo(ids.a, { dash: 'none', fill: 'solid' }, 100, 106)
		zoomTo400()
		// solid xl would reach 5 out; the pointer is on the thin line, 3 above the borderless shape
		expect(hit(200, 103)).toBe(ids.b)
		expect(hit(150, 105.5)).toBe(ids.a)
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

	// draw strokes render (strokeWidth + 1) wide: 11 for xl, so the ink reaches 5.5
	it.each([
		['open', false],
		['closed', true],
	])('%s draw', (_kind, isClosed) => {
		const points = [
			{ x: 0, y: 0, z: 0.5 },
			{ x: 100, y: 0, z: 0.5 },
			{ x: 200, y: 0, z: 0.5 },
			...(isClosed
				? [
						{ x: 200, y: 200, z: 0.5 },
						{ x: 0, y: 200, z: 0.5 },
						{ x: 0, y: 0, z: 0.5 },
					]
				: []),
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
		const geometry = editor.getShapeGeometry(ids.a)
		expect(geometry.isClosed).toBe(isClosed)
		expect(geometry.hitPadding).toBe(5.5)
		// out from the stroke's nearest point, on both sides
		for (const toward of [new Vec(50, -50), new Vec(50, 50)]) {
			const nearest = geometry.nearestPoint(toward)
			const at = (d: number) =>
				Vec.Add({ x: 100, y: 100 }, Vec.Sub(toward, nearest).uni().mul(d).add(nearest))
			expect(hit(at(5.4).x, at(5.4).y)).toBe(ids.a)
			expect(hit(at(6).x, at(6).y)).toBe(null)
		}
	})
})

describe('labels', () => {
	it.each([
		['geo', () => geo(ids.a, { w: 400, h: 400, richText: toRichText('hello') })],
		[
			'arrow',
			() =>
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
				}),
		],
	])('hits a %s label only inside its box', (_, create) => {
		zoomTo400()
		create()
		const label = (editor.getShapeGeometry(ids.a) as Group2d).children.find((c) => c.isLabel)!
		expect(label.hitPadding).toBe(0)
		// the label's top edge, away from the stroke's ink
		const { minY, center } = label.bounds
		expect(hit(100 + center.x, 100 + minY + 0.25)).toBe(ids.a)
		expect(hit(100 + center.x, 100 + minY - 0.5)).toBe(null)
	})
})

describe('overlapping shapes', () => {
	// a thin line at 100 (s ink 99..101, m 98.25..101.75, xl 95..105) and an xl line at 104 (99..109)
	it.each([
		['on the xl ink only, s on top', 's', true, 101.5, ids.b],
		['on the xl ink only, s below', 's', false, 101.5, ids.b],
		['on both inks, s on top', 's', true, 100.5, ids.a],
		['on both inks, s below', 's', false, 100.5, ids.b],
		['on both inks, m on top', 'm', true, 100.5, ids.a],
		['on both inks, m below', 'm', false, 100.5, ids.b],
		['on both xl inks, a on top', 'xl', true, 100.5, ids.a],
		['on both xl inks, a below', 'xl', false, 100.5, ids.b],
	] as const)('picks the right line %s', (_, size, aOnTop, y, id) => {
		const lines = [() => line(ids.b, 104, 'xl'), () => line(ids.a, 100, size)]
		if (!aOnTop) lines.reverse()
		lines.forEach((create) => create())
		expect(hit(200, y)).toBe(id)
	})

	// 2 from s's edge (1 past its ink) and 3 from l's edge (0.5 past its ink): the raw distance
	// picks s, a distance-to-ink ranking would pick l
	it.each([true, false])(
		'picks the closest thin edge at 100%%, as without padding, s on top: %s',
		(sOnTop) => {
			const shapes = [() => geo(ids.b, { size: 'l' }, 105), () => geo(ids.a, { size: 's' }, 100)]
			if (!sOnTop) shapes.reverse()
			shapes.forEach((create) => create())
			expect(hit(102, 200)).toBe(ids.a)
		}
	)

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
		expect(click(95.5, 200)).toBe(ids.a)
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

	it.each([
		['erases', 'eraser', () => editor.getErasingShapeIds()],
		['scribble selects', 'scribble', () => editor.getSelectedShapeIds()],
	] as const)('%s along the outer ink of a long edge', (_, tool, getIds) => {
		drag(tool, alongTopInk)
		expect(getIds()).toEqual([ids.a])
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

describe('default options', () => {
	// No margin: open shapes still reach the hit test margin within their bounds, and their ink
	// outside them
	it.each([
		['a flat line 3 off', 0, { x: 200, y: 97 }, ids.a],
		['a flat line 6 off', 0, { x: 200, y: 94 }, undefined],
		["a diagonal line's round cap, outside its bounds", 200, { x: 99, y: 99 }, ids.a],
	])('picks %s', (_, rise, point, id) => {
		line(ids.a, 100, 'm', rise)
		expect(editor.getShapeAtPoint(point)?.id).toBe(id)
	})
})
