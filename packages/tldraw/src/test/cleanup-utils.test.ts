import { TLArrowShape, TLGeoShape, TLTextShape, createShapeId, toRichText } from '@tldraw/editor'
import {
	cleanupCanvas,
	rerouteArrows,
	resolveShapeOverlaps,
	resolveTextWordWrap,
} from '../lib/utils/cleanup/cleanup'
import { TestEditor } from './TestEditor'

// Mock measurement constants (mirror of TestEditor mock):
//   naturalWidth = charCount * (fontSize / 2)
//   scrollWidth  = max(naturalWidth, maxWidth)  when measureScrollWidth=true
//
// Shape-type constants used in calculations:
//   LABEL_FONT_SIZES.m  = 22   (geo shapes, unscaled)
//   FONT_SIZES.m        = 24   (text shapes)
//   ARROW_LABEL_FONT_SIZES.m = 20  (arrow labels, pre-scaled by shape.props.scale)
//   LABEL_PADDING       = 16   (geo shape text area inset, each side)
//   ARROW_LABEL_BODY_MARGIN = 64

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

const ids = {
	boxA: createShapeId('boxA'),
	boxB: createShapeId('boxB'),
}

// ---------------------------------------------------------------------------
// resolveTextWordWrap
// ---------------------------------------------------------------------------

describe('resolveTextWordWrap', () => {
	describe('geo shapes', () => {
		it('widens a geo shape when a word overflows its text area', () => {
			// w=100, scale=1, size='m' → textAreaWidth = floor(100/1 - 16*2) = 68
			// "hello world" (11 chars) → naturalWidth = 11 * (22/2) = 121 > 69 → fix
			// new w = (121 + 1 + 32) * 1 = 154
			editor.createShapes([
				{
					id: ids.boxA,
					type: 'geo',
					x: 0,
					y: 0,
					props: { w: 100, h: 100, richText: toRichText('hello world') },
				},
			])

			resolveTextWordWrap(editor)

			expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(154)
		})

		it('leaves a geo shape alone when all words fit within the text area', () => {
			// "hi" (2 chars) → naturalWidth = 2 * 11 = 22 ≤ 69 → no fix
			editor.createShapes([
				{
					id: ids.boxA,
					type: 'geo',
					x: 0,
					y: 0,
					props: { w: 100, h: 100, richText: toRichText('hi') },
				},
			])

			resolveTextWordWrap(editor)

			expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(100)
		})

		it('skips geo shapes with no text', () => {
			editor.createShapes([{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])

			resolveTextWordWrap(editor)

			expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(100)
		})

		it('accounts for scale when resizing a geo shape', () => {
			// w=100, scale=2, size='m' → textAreaWidth = floor(100/2 - 32) = 18
			// "hi" (2 chars) → naturalWidth = 2 * 11 = 22 > 19 → fix
			// new w = (22 + 1 + 32) * 2 = 110
			editor.createShapes([
				{
					id: ids.boxA,
					type: 'geo',
					x: 0,
					y: 0,
					props: { w: 100, h: 100, scale: 2, richText: toRichText('hi') },
				},
			])

			resolveTextWordWrap(editor)

			expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(110)
		})

		it('skips shapes inside frames and groups when no shapeIds are provided', () => {
			// Create a frame containing a geo shape with overflowing text.
			// resolveTextWordWrap() with no args should only process top-level shapes (isPageId filter),
			// leaving the nested shape untouched.
			const frameId = createShapeId('frame')
			editor.createShapes([
				{ id: frameId, type: 'frame', x: 0, y: 0, props: { w: 300, h: 300 } },
				{
					id: ids.boxA,
					type: 'geo',
					parentId: frameId,
					x: 0,
					y: 0,
					props: { w: 100, h: 100, richText: toRichText('hello world') },
				},
			])

			resolveTextWordWrap(editor)

			expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(100) // untouched
		})

		it('only processes the shapes given in shapeIds', () => {
			editor.createShapes([
				{
					id: ids.boxA,
					type: 'geo',
					x: 0,
					y: 0,
					props: { w: 100, h: 100, richText: toRichText('hello world') },
				},
				{
					id: ids.boxB,
					type: 'geo',
					x: 200,
					y: 0,
					props: { w: 100, h: 100, richText: toRichText('hello world') },
				},
			])

			resolveTextWordWrap(editor, { shapeIds: [ids.boxA] })

			expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(154) // fixed
			expect((editor.getShape(ids.boxB)! as TLGeoShape).props.w).toBe(100) // untouched
		})
	})

	describe('text shapes', () => {
		it('widens a fixed-width text shape when a word overflows', () => {
			// w=100, size='m' → currentWidth = 100
			// "hello world" (11 chars) → naturalWidth = 11 * (24/2) = 132 > 101 → fix
			// new w = 132 + 1 = 133, deltaW = 33, x = 0 - 33/2 = -16.5
			editor.createShapes([
				{
					id: ids.boxA,
					type: 'text',
					x: 0,
					y: 0,
					props: {
						w: 100,
						autoSize: false,
						richText: toRichText('hello world'),
					},
				},
			])

			resolveTextWordWrap(editor)

			expect((editor.getShape(ids.boxA)! as TLTextShape).props.w).toBe(133)
			expect(editor.getShape(ids.boxA)!.x).toBeCloseTo(-16.5)
		})

		it('leaves a fixed-width text shape alone when all words fit', () => {
			// w=140 → currentWidth = 140
			// "hello world" → naturalWidth = 132 ≤ 141 → no fix
			editor.createShapes([
				{
					id: ids.boxA,
					type: 'text',
					x: 0,
					y: 0,
					props: {
						w: 140,
						autoSize: false,
						richText: toRichText('hello world'),
					},
				},
			])

			resolveTextWordWrap(editor)

			expect((editor.getShape(ids.boxA)! as TLTextShape).props.w).toBe(140)
		})

		it('skips auto-size text shapes', () => {
			editor.createShapes([
				{
					id: ids.boxA,
					type: 'text',
					x: 0,
					y: 0,
					props: {
						w: 100,
						autoSize: true,
						richText: toRichText('hello world'),
					},
				},
			])

			resolveTextWordWrap(editor)

			expect((editor.getShape(ids.boxA)! as TLTextShape).props.w).toBe(100)
		})
	})

	describe('arrow labels', () => {
		it('moves both bound shapes apart when the label needs more body length', () => {
			// boxA at (0,0,100,100), boxB at (200,0,100,100)
			// gap = bMinProj - aMaxProj = 200 - 100 = 100
			// "hello world" (11 chars), fontSize=20 → widestWordWidth = 11 * 10 = 110
			// requiredBodyLength = 110 + 64 = 174
			// halfExtra = (174 - 100) / 2 = 37
			// boxA.x = 0 - 37 = -37, boxB.x = 200 + 37 = 237
			editor.createShapes([
				{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
				{ id: ids.boxB, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } },
			])
			editor
				.setCurrentTool('arrow')
				.pointerMove(50, 50)
				.pointerDown()
				.pointerMove(250, 50)
				.pointerUp()
			const arrowShape = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			editor.updateShapes([
				{ id: arrowShape.id, type: 'arrow', props: { richText: toRichText('hello world') } },
			])

			resolveTextWordWrap(editor)

			expect(editor.getShape(ids.boxA)!.x).toBeCloseTo(-37)
			expect(editor.getShape(ids.boxB)!.x).toBeCloseTo(237)
		})

		it('leaves shapes in place when the arrow body is already long enough', () => {
			// boxA at (0,0,100,100), boxB at (300,0,100,100) → gap = 200 ≥ 174 → no fix
			editor.createShapes([
				{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
				{ id: ids.boxB, type: 'geo', x: 300, y: 0, props: { w: 100, h: 100 } },
			])
			editor
				.setCurrentTool('arrow')
				.pointerMove(50, 50)
				.pointerDown()
				.pointerMove(350, 50)
				.pointerUp()
			const arrowShape = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			editor.updateShapes([
				{ id: arrowShape.id, type: 'arrow', props: { richText: toRichText('hello world') } },
			])

			resolveTextWordWrap(editor)

			expect(editor.getShape(ids.boxA)!.x).toBeCloseTo(0)
			expect(editor.getShape(ids.boxB)!.x).toBeCloseTo(300)
		})

		it('skips arrows with only one terminal bound to a shape', () => {
			editor.createShapes([{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
			// Arrow starts inside boxA but ends on the empty canvas
			editor
				.setCurrentTool('arrow')
				.pointerMove(50, 50)
				.pointerDown()
				.pointerMove(400, 50)
				.pointerUp()
			const arrowShape = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			editor.updateShapes([
				{ id: arrowShape.id, type: 'arrow', props: { richText: toRichText('hello world') } },
			])

			resolveTextWordWrap(editor)

			expect(editor.getShape(ids.boxA)!.x).toBe(0)
		})

		it('skips arrows with no label', () => {
			editor.createShapes([
				{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
				{ id: ids.boxB, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } },
			])
			editor
				.setCurrentTool('arrow')
				.pointerMove(50, 50)
				.pointerDown()
				.pointerMove(250, 50)
				.pointerUp()

			resolveTextWordWrap(editor)

			expect(editor.getShape(ids.boxA)!.x).toBe(0)
			expect(editor.getShape(ids.boxB)!.x).toBe(200)
		})

		it('uses fresh shape bounds when computing arrow separation after geo resizing', () => {
			// boxA starts narrow (w=50) with overflowing text.
			// After word wrap, boxA is widened to w=154 and its center is preserved
			// (x shifts from 0 to -52, i.e. x -= deltaW/2 = -(154-50)/2 = -52).
			// The arrow fix must use the widened/shifted bounds, not the original w=50.
			//
			// Note: onBeforeCreate sets growY=108 on boxA (to fit the tall label), making
			// the shape 208px tall. This causes the arrow direction to be diagonal (not purely
			// horizontal), so the exact positions depend on projection onto that diagonal.
			//
			// With fresh bounds (w=154, x=-52, h=208): boxB.x ≈ 249.61
			// With stale bounds (w=50, x=0, h=208): boxB.x ≈ 225.04
			editor.createShapes([
				{
					id: ids.boxA,
					type: 'geo',
					x: 0,
					y: 0,
					props: { w: 50, h: 100, richText: toRichText('hello world') },
				},
				{ id: ids.boxB, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } },
			])
			editor
				.setCurrentTool('arrow')
				.pointerMove(25, 50)
				.pointerDown()
				.pointerMove(250, 50)
				.pointerUp()
			const arrowShape = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			editor.updateShapes([
				{ id: arrowShape.id, type: 'arrow', props: { richText: toRichText('hello world') } },
			])

			resolveTextWordWrap(editor)

			// Verify word wrap ran: boxA.w = (121 + 32) * 1 = 154
			expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(154)
			// Verify arrow fix used fresh bounds (≈249.61), not stale (≈225.04)
			expect(editor.getShape(ids.boxB)!.x).toBeCloseTo(249.61, 1)
		})

		it('does not move endpoint shapes that are outside the provided shapeIds', () => {
			// Arrow has a label that needs more space, but boxA and boxB are not in shapeIds.
			// Only the arrow itself is listed — the endpoint shapes should not be displaced.
			editor.createShapes([
				{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
				{ id: ids.boxB, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } },
			])
			editor
				.setCurrentTool('arrow')
				.pointerMove(50, 50)
				.pointerDown()
				.pointerMove(250, 50)
				.pointerUp()
			const arrowShape = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			editor.updateShapes([
				{ id: arrowShape.id, type: 'arrow', props: { richText: toRichText('hello world') } },
			])

			resolveTextWordWrap(editor, { shapeIds: [arrowShape.id] })

			// Endpoint shapes were not in shapeIds — they must not have moved
			expect(editor.getShape(ids.boxA)!.x).toBe(0)
			expect(editor.getShape(ids.boxB)!.x).toBe(200)
		})

		it('groups all changes into a single undoable step', () => {
			editor.createShapes([
				{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
				{ id: ids.boxB, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } },
			])
			editor
				.setCurrentTool('arrow')
				.pointerMove(50, 50)
				.pointerDown()
				.pointerMove(250, 50)
				.pointerUp()
			const arrowShape = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			editor.updateShapes([
				{ id: arrowShape.id, type: 'arrow', props: { richText: toRichText('hello world') } },
			])
			editor.markHistoryStoppingPoint('before cleanup')

			resolveTextWordWrap(editor)

			expect(editor.getShape(ids.boxA)!.x).toBeCloseTo(-37)

			editor.undo()

			expect(editor.getShape(ids.boxA)!.x).toBe(0)
			expect(editor.getShape(ids.boxB)!.x).toBe(200)
		})
	})

	it('does not modify shapes when nothing needs fixing', () => {
		// Create a shape whose label already fits — the early-return path should fire.
		editor.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 200, h: 100, richText: toRichText('hi') },
			},
		])

		resolveTextWordWrap(editor)

		const shape = editor.getShape(ids.boxA)! as TLGeoShape
		expect(shape.props.w).toBe(200)
		expect(shape.x).toBe(0)
	})
})

// ---------------------------------------------------------------------------
// resolveShapeOverlaps
// ---------------------------------------------------------------------------

describe('resolveShapeOverlaps', () => {
	it('separates two overlapping shapes to exactly the required gap', () => {
		// A at (0,0,100,100), B at (50,0,100,100), padding=20
		// centers: cA=(50,50), cB=(100,50) → dir=(1,0), dist=50
		// supportA = 50, supportB = 50 → sep = 50+50+20-50 = 70
		// equal areas → wA=wB=0.5 → da.x=-35, db.x=+35
		// A.x = 0-35 = -35, B.x = 50+35 = 85 → gap = 85-(−35+100) = 20 ✓
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.boxB, type: 'geo', x: 50, y: 0, props: { w: 100, h: 100 } },
		])

		resolveShapeOverlaps(editor)

		expect(editor.getShape(ids.boxA)!.x).toBeCloseTo(-35)
		expect(editor.getShape(ids.boxB)!.x).toBeCloseTo(85)
	})

	it('leaves non-overlapping shapes unchanged', () => {
		// Gap = 150-100 = 50 > padding=20 → no movement
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.boxB, type: 'geo', x: 150, y: 0, props: { w: 100, h: 100 } },
		])

		resolveShapeOverlaps(editor)

		expect(editor.getShape(ids.boxA)!.x).toBe(0)
		expect(editor.getShape(ids.boxB)!.x).toBe(150)
	})

	it('respects a custom padding value', () => {
		// A at (0,0,100,100), B at (50,0,100,100), padding=40
		// centers: cA=(50,50), cB=(100,50) → dir=(1,0), dist=50
		// supportA=50, supportB=50 → sep = 50+50+40-50 = 90
		// equal areas → wA=wB=0.5 → da.x=-45, db.x=+45 → A.x=-45, B.x=95
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.boxB, type: 'geo', x: 50, y: 0, props: { w: 100, h: 100 } },
		])

		resolveShapeOverlaps(editor, { padding: 40 })

		expect(editor.getShape(ids.boxA)!.x).toBeCloseTo(-45)
		expect(editor.getShape(ids.boxB)!.x).toBeCloseTo(95)
	})

	it('excludes arrow shapes from the default page-shapes path', () => {
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.boxB, type: 'geo', x: 50, y: 0, props: { w: 100, h: 100 } },
		])
		editor.setCurrentTool('arrow').pointerMove(50, 50).pointerDown().pointerMove(75, 50).pointerUp()
		const arrowShape = editor.getCurrentPageShapes().find((s) => s.type === 'arrow')!
		const arrowXBefore = arrowShape.x

		resolveShapeOverlaps(editor)

		// Arrow should not have been repositioned
		expect(editor.getShape(arrowShape.id)!.x).toBe(arrowXBefore)
	})

	it('excludes arrow shapes even when they are listed in shapeIds', () => {
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.boxB, type: 'geo', x: 50, y: 0, props: { w: 100, h: 100 } },
		])
		editor.setCurrentTool('arrow').pointerMove(50, 50).pointerDown().pointerMove(75, 50).pointerUp()
		const arrowShape = editor.getCurrentPageShapes().find((s) => s.type === 'arrow')!
		const arrowXBefore = arrowShape.x

		resolveShapeOverlaps(editor, { shapeIds: [ids.boxA, ids.boxB, arrowShape.id] })

		// Geo shapes separated; arrow untouched
		expect(editor.getShape(ids.boxA)!.x).toBeCloseTo(-35)
		expect(editor.getShape(ids.boxB)!.x).toBeCloseTo(85)
		expect(editor.getShape(arrowShape.id)!.x).toBe(arrowXBefore)
	})

	it('groups all moves into a single undoable step', () => {
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.boxB, type: 'geo', x: 50, y: 0, props: { w: 100, h: 100 } },
		])
		editor.markHistoryStoppingPoint('before cleanup')

		resolveShapeOverlaps(editor)

		expect(editor.getShape(ids.boxA)!.x).toBeCloseTo(-35)

		editor.undo()

		expect(editor.getShape(ids.boxA)!.x).toBe(0)
		expect(editor.getShape(ids.boxB)!.x).toBe(50)
	})
})

// ---------------------------------------------------------------------------
// rerouteArrows
// ---------------------------------------------------------------------------

describe('rerouteArrows', () => {
	it('changes the bend of an arrow whose path passes through a bystander shape', () => {
		// boxA and boxB are the arrow endpoints; boxC sits across the direct path at y=30.
		// Arrow center-to-center: (30,30)→(430,30), bend starts at 0 (straight).
		// boxC page bounds [175,255]x[10,70] — the straight arrow at y=30 passes through it.
		const boxC = createShapeId('boxC')
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 60, h: 60 } },
			{ id: ids.boxB, type: 'geo', x: 400, y: 0, props: { w: 60, h: 60 } },
			{ id: boxC, type: 'geo', x: 175, y: 10, props: { w: 80, h: 60 } },
		])
		editor
			.setCurrentTool('arrow')
			.pointerMove(30, 30)
			.pointerDown()
			.pointerMove(430, 30)
			.pointerUp()
		const arrowShape = editor.getCurrentPageShapes().find((s) => s.type === 'arrow') as TLArrowShape

		rerouteArrows(editor)

		// Bend should have changed from 0 — the arrow now curves around boxC
		expect((editor.getShape(arrowShape.id) as TLArrowShape).props.bend).not.toBe(0)
	})

	it('leaves an arrow alone when its path does not overlap any shape', () => {
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 60, h: 60 } },
			{ id: ids.boxB, type: 'geo', x: 400, y: 0, props: { w: 60, h: 60 } },
		])
		editor
			.setCurrentTool('arrow')
			.pointerMove(30, 30)
			.pointerDown()
			.pointerMove(430, 30)
			.pointerUp()
		const arrowShape = editor.getCurrentPageShapes().find((s) => s.type === 'arrow') as TLArrowShape

		rerouteArrows(editor)

		expect((editor.getShape(arrowShape.id) as TLArrowShape).props.bend).toBe(0)
	})

	it('skips elbow arrows', () => {
		// Elbow arrows route automatically — rerouteArrows must not touch their bend prop
		const boxC = createShapeId('boxC')
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 60, h: 60 } },
			{ id: ids.boxB, type: 'geo', x: 400, y: 0, props: { w: 60, h: 60 } },
			{ id: boxC, type: 'geo', x: 175, y: 10, props: { w: 80, h: 60 } },
		])
		editor
			.setCurrentTool('arrow')
			.pointerMove(30, 30)
			.pointerDown()
			.pointerMove(430, 30)
			.pointerUp()
		const arrowShape = editor.getCurrentPageShapes().find((s) => s.type === 'arrow') as TLArrowShape
		editor.updateShapes([{ id: arrowShape.id, type: 'arrow', props: { kind: 'elbow' } }])

		rerouteArrows(editor)

		expect((editor.getShape(arrowShape.id) as TLArrowShape).props.bend).toBe(0)
	})

	it('groups all changes into a single undoable step', () => {
		const boxC = createShapeId('boxC')
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 60, h: 60 } },
			{ id: ids.boxB, type: 'geo', x: 400, y: 0, props: { w: 60, h: 60 } },
			{ id: boxC, type: 'geo', x: 175, y: 10, props: { w: 80, h: 60 } },
		])
		editor
			.setCurrentTool('arrow')
			.pointerMove(30, 30)
			.pointerDown()
			.pointerMove(430, 30)
			.pointerUp()
		const arrowShape = editor.getCurrentPageShapes().find((s) => s.type === 'arrow') as TLArrowShape
		editor.markHistoryStoppingPoint('before reroute')

		rerouteArrows(editor)
		expect((editor.getShape(arrowShape.id) as TLArrowShape).props.bend).not.toBe(0)

		editor.undo()
		expect((editor.getShape(arrowShape.id) as TLArrowShape).props.bend).toBe(0)
	})
})

// ---------------------------------------------------------------------------
// cleanupCanvas
// ---------------------------------------------------------------------------

describe('cleanupCanvas', () => {
	it('runs all three cleanup passes as a single undoable step', () => {
		// boxA has overflowing text; boxA and boxB overlap
		editor.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, richText: toRichText('hello world') },
			},
			{ id: ids.boxB, type: 'geo', x: 50, y: 0, props: { w: 100, h: 100 } },
		])
		editor.markHistoryStoppingPoint('before cleanup')

		cleanupCanvas(editor)

		// Word wrap should have widened boxA
		expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(154)

		// Single undo should restore everything
		editor.undo()

		expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(100)
		expect(editor.getShape(ids.boxB)!.x).toBe(50)
	})

	it('applies word wrap before overlap resolution so overlap uses fresh bounds', () => {
		// After word wrap: boxA grows from w=100 to w=154 (text "hello world" overflows)
		// boxB at x=120 is now inside the widened boxA → overlap resolution must use w=154
		// If word wrap ran after overlap, or if stale bounds were used, there would be no gap
		editor.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, richText: toRichText('hello world') },
			},
			{ id: ids.boxB, type: 'geo', x: 120, y: 0, props: { w: 100, h: 100 } },
		])

		cleanupCanvas(editor)

		// boxA widened
		expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(154)

		// Overlap resolved using fresh bounds → gap ≥ padding
		const boundsA = editor.getShapePageBounds(editor.getShape(ids.boxA)!)!
		const boundsB = editor.getShapePageBounds(editor.getShape(ids.boxB)!)!
		expect(boundsB.minX - boundsA.maxX).toBeGreaterThanOrEqual(20)
	})
})
