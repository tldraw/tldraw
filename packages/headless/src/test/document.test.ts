import {
	Box,
	Editor,
	IndexKey,
	TLArrowShape,
	TLDrawShape,
	TLEmbedShape,
	TLFrameShape,
	TLGeoShape,
	TLHighlightShape,
	TLLineShape,
	TLNoteShape,
	TLShapeId,
	TLTextShape,
	createShapeId,
} from '@tldraw/editor'
import { b64Vecs, toRichText } from '@tldraw/tlschema'
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../lib/createHeadlessEditor'

const editors: Editor[] = []
function makeEditor(opts: Parameters<typeof createHeadlessEditor>[0] = {}) {
	// No test here needs the tick loop; 'manual' keeps this file's editors from spinning real timers
	const editor = createHeadlessEditor({ frameLoop: 'manual', ...opts })
	editors.push(editor)
	return editor
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.dispose()
})

describe('shape CRUD', () => {
	it('creates, reads, updates, and deletes a geo rectangle', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({
			id,
			type: 'geo',
			x: 10,
			y: 20,
			props: { geo: 'rectangle', w: 300, h: 150, color: 'blue', fill: 'solid' },
		})

		const shape = editor.getShape<TLGeoShape>(id)!
		expect(shape).toMatchObject({
			id,
			type: 'geo',
			x: 10,
			y: 20,
			rotation: 0,
			props: { geo: 'rectangle', w: 300, h: 150, color: 'blue', fill: 'solid' },
		})
		expect(editor.getShapePageBounds(id)).toEqual(new Box(10, 20, 300, 150))

		editor.updateShape<TLGeoShape>({ id, type: 'geo', props: { color: 'red' } })
		expect(editor.getShape<TLGeoShape>(id)!.props.color).toBe('red')
		// records are immutable snapshots — an already-read shape does not see later updates
		expect(shape.props.color).toBe('blue')

		editor.deleteShape(id)
		expect(editor.getShape(id)).toBeUndefined()
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
	})

	it('gives polygonal geo variants page bounds exactly matching w/h', () => {
		const editor = makeEditor()
		for (const geo of ['rectangle', 'ellipse', 'check-box', 'diamond', 'x-box'] as const) {
			const id = createShapeId()
			editor.createShape<TLGeoShape>({ id, type: 'geo', x: 5, y: 7, props: { geo, w: 120, h: 80 } })
			expect(editor.getShapePageBounds(id), geo).toEqual(new Box(5, 7, 120, 80))
			expect(editor.getShapeGeometry(id).bounds, geo).toEqual(new Box(0, 0, 120, 80))
		}
	})

	it('gives organic geo variants bounds that deviate from their w/h props', () => {
		const editor = makeEditor()

		// a cloud's puffy outline is generated inside the w/h box, so its actual bounds are
		// narrower than the props claim and slightly offset — w/h are a bounding hint, not
		// the true geometry
		const cloud = createShapeId()
		editor.createShape<TLGeoShape>({
			id: cloud,
			type: 'geo',
			x: 5,
			y: 7,
			props: { geo: 'cloud', w: 120, h: 80 },
		})
		const cloudBounds = editor.getShapePageBounds(cloud)!
		expect(cloudBounds.w).toBeLessThan(120)
		expect(cloudBounds.x).toBeGreaterThan(5)

		// a heart is shorter than its h and starts below its y
		const heart = createShapeId()
		editor.createShape<TLGeoShape>({
			id: heart,
			type: 'geo',
			x: 5,
			y: 7,
			props: { geo: 'heart', w: 120, h: 80 },
		})
		const heartBounds = editor.getShapePageBounds(heart)!
		expect(heartBounds.w).toBe(120)
		expect(heartBounds.h).toBeLessThan(80)
		expect(heartBounds.y).toBeGreaterThan(7)

		// even a star undershoots: its points are placed slightly inside the w/h box
		const star = createShapeId()
		editor.createShape<TLGeoShape>({
			id: star,
			type: 'geo',
			x: 5,
			y: 7,
			props: { geo: 'star', w: 120, h: 80 },
		})
		const starBounds = editor.getShapePageBounds(star)!
		expect(starBounds.w).toBeLessThan(120)
		expect(starBounds.w).toBeGreaterThan(119)
		expect(starBounds.h).toBeLessThan(80)
	})

	it('fills in default props for a bare createShape call', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape({ id, type: 'geo' })
		const shape = editor.getShape<TLGeoShape>(id)!
		expect(shape).toMatchObject({
			x: 0,
			y: 0,
			rotation: 0,
			opacity: 1,
			isLocked: false,
			props: { geo: 'rectangle', w: 100, h: 100, color: 'black', fill: 'none', dash: 'draw' },
		})
	})

	it('creates, grows, and deletes a note shape', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLNoteShape>({ id, type: 'note', x: 0, y: 0 })
		expect(editor.getShapePageBounds(id)).toEqual(new Box(0, 0, 200, 200))

		editor.updateShape<TLNoteShape>({
			id,
			type: 'note',
			props: { richText: toRichText(Array.from({ length: 12 }, () => 'line of text').join('\n')) },
		})
		const grown = editor.getShapePageBounds(id)!
		// notes grow vertically to fit text but never widen
		expect(grown.w).toBe(200)
		expect(grown.h).toBeGreaterThan(200)

		editor.deleteShape(id)
		expect(editor.getShape(id)).toBeUndefined()
	})

	it('sizes text shapes with the approximate character-count measurer', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLTextShape>({
			id,
			type: 'text',
			x: 0,
			y: 0,
			props: { richText: toRichText('Hello'), size: 'm' },
		})
		const bounds = editor.getShapePageBounds(id)!
		// size 'm' is fontSize 24, so 5 chars ≈ 5 * 12 = 60px wide plus fixed padding
		expect(bounds.w).toBeGreaterThanOrEqual(60)
		expect(bounds.w).toBeLessThan(80)
		expect(bounds.h).toBeGreaterThanOrEqual(24)

		editor.updateShape<TLTextShape>({
			id,
			type: 'text',
			props: { richText: toRichText('Hello there, headless world') },
		})
		expect(editor.getShapePageBounds(id)!.w).toBeGreaterThan(bounds.w)

		const big = createShapeId()
		editor.createShape<TLTextShape>({
			id: big,
			type: 'text',
			x: 0,
			y: 0,
			props: { richText: toRichText('Hello'), size: 'm', scale: 2 },
		})
		expect(editor.getShapePageBounds(big)!.w).toBeCloseTo(bounds.w * 2, 6)
	})

	it('creates, updates, and deletes an arrow shape', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLArrowShape>({
			id,
			type: 'arrow',
			x: 100,
			y: 100,
			props: { start: { x: 0, y: 0 }, end: { x: 300, y: 150 } },
		})
		const bounds = editor.getShapePageBounds(id)!
		expect(bounds.x).toBeCloseTo(100, 0)
		expect(bounds.y).toBeCloseTo(100, 0)
		expect(bounds.w).toBeCloseTo(300, 0)
		expect(bounds.h).toBeCloseTo(150, 0)

		editor.updateShape<TLArrowShape>({ id, type: 'arrow', props: { end: { x: 600, y: 150 } } })
		expect(editor.getShapePageBounds(id)!.w).toBeCloseTo(600, 0)

		editor.deleteShape(id)
		expect(editor.getShape(id)).toBeUndefined()
	})

	it('creates a line shape from a points record and updates a point', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLLineShape>({
			id,
			type: 'line',
			x: 10,
			y: 10,
			props: {
				points: {
					a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
					a2: { id: 'a2', index: 'a2' as IndexKey, x: 100, y: 50 },
					a3: { id: 'a3', index: 'a3' as IndexKey, x: 200, y: 0 },
				},
			},
		})
		expect(editor.getShapePageBounds(id)).toEqual(new Box(10, 10, 200, 50))

		const points = editor.getShape<TLLineShape>(id)!.props.points
		editor.updateShape<TLLineShape>({
			id,
			type: 'line',
			props: { points: { ...points, a3: { ...points.a3, x: 400 } } },
		})
		expect(editor.getShapePageBounds(id)!.w).toBe(400)
	})

	it('creates a draw shape from base64-encoded segment points', () => {
		const editor = makeEditor()
		const id = createShapeId()
		const points = [
			{ x: 0, y: 0, z: 0.5 },
			{ x: 50, y: 20, z: 0.5 },
			{ x: 100, y: 80, z: 0.5 },
			{ x: 160, y: 40, z: 0.5 },
		]
		editor.createShape<TLDrawShape>({
			id,
			type: 'draw',
			x: 0,
			y: 0,
			props: {
				segments: [{ type: 'free', path: b64Vecs.encodePoints(points) }],
				isComplete: true,
			},
		})
		const bounds = editor.getShapePageBounds(id)!
		expect(bounds.w).toBeCloseTo(160, 0)
		// the raw points span y 0..80, but freehand's streamline smoothing pulls sparse
		// interior points hard toward the chord — the measured height is roughly half the
		// input extent. Draw bounds only track input points when they are dense.
		expect(bounds.h).toBeCloseTo(41.44, 1)

		// for this multi-point open stroke the scale prop is bounds-neutral (it feeds the
		// stroke width into the freehand options, not the point geometry) — resizing a draw
		// shape goes through scaleX/scaleY, which do scale the points
		editor.updateShape<TLDrawShape>({ id, type: 'draw', props: { scale: 2 } })
		expect(editor.getShapePageBounds(id)).toEqual(bounds)
		editor.updateShape<TLDrawShape>({ id, type: 'draw', props: { scale: 1, scaleX: 2 } })
		expect(editor.getShapePageBounds(id)!.w).toBeCloseTo(320, 0)
	})

	it('rejects draw segments given raw points instead of an encoded path', () => {
		const editor = makeEditor()
		expect(() =>
			editor.createShape({
				id: createShapeId(),
				type: 'draw',
				x: 0,
				y: 0,
				// the segment type takes an encoded `path`, not raw points — asserted at runtime too
				props: { segments: [{ type: 'free', points: [{ x: 0, y: 0, z: 0.5 }] } as any] },
			})
		).toThrow()
	})

	it('creates a highlight shape from encoded segments', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLHighlightShape>({
			id,
			type: 'highlight',
			x: 20,
			y: 30,
			props: {
				segments: [
					{
						type: 'free',
						path: b64Vecs.encodePoints([
							{ x: 0, y: 0, z: 0.5 },
							{ x: 100, y: 0, z: 0.5 },
							{ x: 200, y: 60, z: 0.5 },
						]),
					},
				],
				isComplete: true,
			},
		})
		// unlike draw shapes, highlight geometry includes the marker's stroke radius: the
		// bounds overhang the input points by ~14px on every side
		const bounds = editor.getShapePageBounds(id)!
		expect(bounds.x).toBeLessThan(20)
		expect(bounds.y).toBeLessThan(30)
		expect(bounds.w).toBeCloseTo(227.9, 0)
		expect(bounds.h).toBeCloseTo(87.9, 0)

		editor.updateShape<TLHighlightShape>({ id, type: 'highlight', props: { color: 'green' } })
		expect(editor.getShape<TLHighlightShape>(id)!.props.color).toBe('green')
	})

	it('creates and renames a frame shape', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLFrameShape>({
			id,
			type: 'frame',
			x: 0,
			y: 0,
			props: { w: 400, h: 300, name: 'My frame' },
		})
		expect(editor.getShapePageBounds(id)).toEqual(new Box(0, 0, 400, 300))
		editor.updateShape<TLFrameShape>({ id, type: 'frame', props: { name: 'Renamed' } })
		expect(editor.getShape<TLFrameShape>(id)!.props.name).toBe('Renamed')
	})

	it('creates and resizes an embed shape', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLEmbedShape>({
			id,
			type: 'embed',
			x: 0,
			y: 0,
			props: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', w: 640, h: 360 },
		})
		expect(editor.getShapePageBounds(id)).toEqual(new Box(0, 0, 640, 360))
		editor.updateShape<TLEmbedShape>({ id, type: 'embed', props: { w: 320, h: 180 } })
		expect(editor.getShapePageBounds(id)).toEqual(new Box(0, 0, 320, 180))
	})
})

describe('batch operations', () => {
	it('creates multiple shapes in one call, sorted in creation order', () => {
		const editor = makeEditor()
		const ids = [createShapeId('a'), createShapeId('b'), createShapeId('c')]
		editor.createShapes<TLGeoShape>(
			ids.map((id, i) => ({ id, type: 'geo', x: i * 200, y: 0, props: { w: 100, h: 100 } }))
		)
		expect(editor.getCurrentPageShapes()).toHaveLength(3)
		expect(editor.getCurrentPageShapesSorted().map((s) => s.id)).toEqual(ids)
	})

	it('updates multiple shapes in one call', () => {
		const editor = makeEditor()
		const ids = [createShapeId(), createShapeId()]
		editor.createShapes<TLGeoShape>(ids.map((id) => ({ id, type: 'geo', x: 0, y: 0 })))
		editor.updateShapes<TLGeoShape>(
			ids.map((id, i) => ({ id, type: 'geo', x: 1000 + i, props: { color: 'violet' } }))
		)
		for (const [i, id] of ids.entries()) {
			expect(editor.getShape<TLGeoShape>(id)).toMatchObject({
				x: 1000 + i,
				props: { color: 'violet' },
			})
		}
	})

	it('deletes multiple shapes in one call', () => {
		const editor = makeEditor()
		const ids = [createShapeId(), createShapeId(), createShapeId()]
		editor.createShapes<TLGeoShape>(ids.map((id) => ({ id, type: 'geo', x: 0, y: 0 })))
		editor.deleteShapes([ids[0], ids[2]])
		expect(editor.getCurrentPageShapes().map((s) => s.id)).toEqual([ids[1]])
	})

	it('deleting an arrow deletes its bindings', () => {
		const editor = makeEditor()
		const a = createShapeId()
		const arrow = createShapeId()
		editor.createShape<TLGeoShape>({ id: a, type: 'geo', x: 0, y: 0 })
		editor.createShape({ id: arrow, type: 'arrow', x: 0, y: 0 })
		editor.createBinding({ type: 'arrow', fromId: arrow, toId: a, props: { terminal: 'start' } })
		expect(editor.getBindingsInvolvingShape(a)).toHaveLength(1)

		editor.deleteShape(arrow)
		expect(editor.getBindingsInvolvingShape(a)).toHaveLength(0)
	})
})

describe('invalid input', () => {
	it('throws a validation error for an invalid style value', () => {
		const editor = makeEditor()
		expect(() =>
			editor.createShape({
				id: createShapeId(),
				type: 'geo',
				x: 0,
				y: 0,
				props: { color: 'hotpink' as 'blue' },
			})
		).toThrow(/color/)
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
	})

	it('throws for an invalid geo kind', () => {
		const editor = makeEditor()
		expect(() =>
			editor.createShape({
				id: createShapeId(),
				type: 'geo',
				x: 0,
				y: 0,
				props: { geo: 'blob' as 'cloud' },
			})
		).toThrow(/geo/)
	})

	it('throws for an unregistered shape type', () => {
		const editor = makeEditor()
		expect(() =>
			editor.createShape({ id: createShapeId(), type: 'wat' as 'geo', x: 0, y: 0 })
		).toThrow()
	})

	it('rejects zero and negative geo dimensions', () => {
		const editor = makeEditor()
		expect(() =>
			editor.createShape({ id: createShapeId(), type: 'geo', x: 0, y: 0, props: { w: 0 } })
		).toThrow()
		expect(() =>
			editor.createShape({ id: createShapeId(), type: 'geo', x: 0, y: 0, props: { w: -50 } })
		).toThrow()
	})

	it('leaves the shape unchanged when an update fails validation', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0, props: { color: 'blue' } })
		expect(() =>
			editor.updateShape({ id, type: 'geo', props: { color: 'not-a-color' as 'blue' } })
		).toThrow()
		expect(editor.getShape<TLGeoShape>(id)!.props.color).toBe('blue')
	})
})

describe('geometry', () => {
	it('reports local geometry independent of position, page bounds including it', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 50, y: 60, props: { w: 100, h: 80 } })
		expect(editor.getShapeGeometry(id).bounds).toEqual(new Box(0, 0, 100, 80))
		expect(editor.getShapePageBounds(id)).toEqual(new Box(50, 60, 100, 80))
	})

	it('rotates page bounds around the shape origin when rotation is set directly', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0, props: { w: 200, h: 100 } })
		editor.updateShape({ id, type: 'geo', rotation: Math.PI / 2 })

		// rotation pivots around the shape's x/y anchor (its top-left corner), not its center
		const bounds = editor.getShapePageBounds(id)!
		expect(bounds.x).toBeCloseTo(-100, 6)
		expect(bounds.y).toBeCloseTo(0, 6)
		expect(bounds.w).toBeCloseTo(100, 6)
		expect(bounds.h).toBeCloseTo(200, 6)

		editor.updateShape({ id, type: 'geo', rotation: Math.PI / 4 })
		const diag = editor.getShapePageBounds(id)!
		expect(diag.w).toBeCloseTo((200 + 100) / Math.SQRT2, 6)
		expect(diag.h).toBeCloseTo((200 + 100) / Math.SQRT2, 6)
	})

	it('hit tests hollow shapes on their edges only, unless hitInside is set', () => {
		const editor = makeEditor()
		const hollow = createShapeId()
		editor.createShape<TLGeoShape>({
			id: hollow,
			type: 'geo',
			x: 100,
			y: 100,
			props: { w: 100, h: 100, fill: 'none' },
		})

		expect(editor.getShapeAtPoint({ x: 150, y: 150 })).toBeUndefined()
		expect(editor.getShapeAtPoint({ x: 150, y: 150 }, { hitInside: true })?.id).toBe(hollow)
		expect(editor.getShapeAtPoint({ x: 150, y: 100 })?.id).toBe(hollow)
	})

	it('hit tests filled shapes anywhere inside', () => {
		const editor = makeEditor()
		const solid = createShapeId()
		editor.createShape<TLGeoShape>({
			id: solid,
			type: 'geo',
			x: 0,
			y: 0,
			props: { w: 100, h: 100, fill: 'solid' },
		})
		expect(editor.getShapeAtPoint({ x: 50, y: 50 })?.id).toBe(solid)
	})

	it('returns the topmost shape from getShapeAtPoint and all hits from getShapesAtPoint', () => {
		const editor = makeEditor()
		const below = createShapeId()
		const above = createShapeId()
		editor.createShape<TLGeoShape>({
			id: below,
			type: 'geo',
			x: 0,
			y: 0,
			props: { w: 100, h: 100, fill: 'solid' },
		})
		editor.createShape<TLGeoShape>({
			id: above,
			type: 'geo',
			x: 50,
			y: 50,
			props: { w: 100, h: 100, fill: 'solid' },
		})

		expect(editor.getShapeAtPoint({ x: 75, y: 75 })?.id).toBe(above)
		// Order matters: the API promises top-most first — sorting both sides would let a
		// reversed traversal (the exact bug the implementation guards) pass unnoticed
		expect(editor.getShapesAtPoint({ x: 75, y: 75 }, { hitInside: true }).map((s) => s.id)).toEqual(
			[above, below]
		)
	})

	it('finds shapes intersecting a box with getShapeIdsInsideBounds', () => {
		const editor = makeEditor()
		const inside = createShapeId()
		const partial = createShapeId()
		const outside = createShapeId()
		editor.createShape<TLGeoShape>({
			id: inside,
			type: 'geo',
			x: 10,
			y: 10,
			props: { w: 50, h: 50 },
		})
		editor.createShape<TLGeoShape>({
			id: partial,
			type: 'geo',
			x: 180,
			y: 10,
			props: { w: 50, h: 50 },
		})
		editor.createShape<TLGeoShape>({
			id: outside,
			type: 'geo',
			x: 500,
			y: 500,
			props: { w: 50, h: 50 },
		})

		// despite the name, this is a broadphase intersection query — partially overlapping
		// shapes are included, not just fully contained ones
		const hits = editor.getShapeIdsInsideBounds(new Box(0, 0, 200, 200))
		expect(hits).toEqual(new Set([inside, partial]))
	})
})

describe('selection', () => {
	function makePair(editor: Editor): [TLShapeId, TLShapeId] {
		const a = createShapeId('a')
		const b = createShapeId('b')
		editor.createShapes<TLGeoShape>([
			{ id: a, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: b, type: 'geo', x: 300, y: 200, props: { w: 100, h: 100 } },
		])
		return [a, b]
	}

	it('selects, deselects, and clears selection', () => {
		const editor = makeEditor()
		const [a, b] = makePair(editor)

		editor.select(a, b)
		expect(editor.getSelectedShapeIds()).toEqual([a, b])
		expect(editor.getOnlySelectedShape()).toBeNull()

		editor.deselect(a)
		expect(editor.getSelectedShapeIds()).toEqual([b])
		expect(editor.getOnlySelectedShape()?.id).toBe(b)

		editor.selectNone()
		expect(editor.getSelectedShapeIds()).toEqual([])
		expect(editor.getSelectionPageBounds()).toBeNull()
	})

	it('selectAll selects every top-level shape and unions selection bounds', () => {
		const editor = makeEditor()
		const [a, b] = makePair(editor)
		editor.selectAll()
		expect(new Set(editor.getSelectedShapeIds())).toEqual(new Set([a, b]))
		expect(editor.getSelectionPageBounds()).toEqual(new Box(0, 0, 400, 300))
	})

	it('setSelectedShapes replaces the selection', () => {
		const editor = makeEditor()
		const [a, b] = makePair(editor)
		editor.setSelectedShapes([a])
		editor.setSelectedShapes([b])
		expect(editor.getSelectedShapeIds()).toEqual([b])
	})

	it('selectAll selects the group, not its members, but direct child selection works', () => {
		const editor = makeEditor()
		const [a, b] = makePair(editor)
		editor.groupShapes([a, b])
		const groupId = editor.getShape(a)!.parentId as TLShapeId

		editor.selectNone()
		editor.selectAll()
		expect(editor.getSelectedShapeIds()).toEqual([groupId])

		// hit testing reports the child; the group is reached via outermost-selectable
		const hit = editor.getShapeAtPoint({ x: 50, y: 0 })
		expect(hit?.id).toBe(a)
		expect(editor.getOutermostSelectableShape(hit!).id).toBe(groupId)

		// programmatic selection is allowed to reach inside groups — and doing so focuses
		// the group, after which the child is its own outermost selectable shape
		editor.select(a)
		expect(editor.getSelectedShapeIds()).toEqual([a])
		expect(editor.getFocusedGroupId()).toBe(groupId)
		expect(editor.getOutermostSelectableShape(a).id).toBe(a)
	})
})
