import { TLArrowShape, TLGeoShape, TLTextShape, createShapeId, toRichText } from '@tldraw/editor'
import { cleanupCanvas } from '../lib/utils/cleanup/cleanupCanvas'
import { rerouteArrows } from '../lib/utils/cleanup/rerouteArrows'
import { resolveShapeOverlaps } from '../lib/utils/cleanup/resolveShapeOverlaps'
import { resolveTextWordWrap } from '../lib/utils/cleanup/resolveTextWordWrap'
import { TestEditor } from './TestEditor'

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

describe('resolveTextWordWrap', () => {
	describe('geo shapes', () => {
		it('widens a geo shape when a word overflows its text area', () => {
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

			expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(100)
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

			expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(154)
			expect((editor.getShape(ids.boxB)! as TLGeoShape).props.w).toBe(100)
		})
	})

	describe('text shapes', () => {
		it('widens a fixed-width text shape when a word overflows', () => {
			editor.createShapes([
				{
					id: ids.boxA,
					type: 'text',
					x: 0,
					y: 0,
					props: { w: 100, autoSize: false, richText: toRichText('hello world') },
				},
			])

			resolveTextWordWrap(editor)

			expect((editor.getShape(ids.boxA)! as TLTextShape).props.w).toBe(133)
			expect(editor.getShape(ids.boxA)!.x).toBeCloseTo(-16.5)
		})

		it('leaves a fixed-width text shape alone when all words fit', () => {
			editor.createShapes([
				{
					id: ids.boxA,
					type: 'text',
					x: 0,
					y: 0,
					props: { w: 140, autoSize: false, richText: toRichText('hello world') },
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
					props: { w: 100, autoSize: true, richText: toRichText('hello world') },
				},
			])

			resolveTextWordWrap(editor)

			expect((editor.getShape(ids.boxA)! as TLTextShape).props.w).toBe(100)
		})
	})

	describe('arrow labels', () => {
		it('moves both bound shapes apart when the label needs more body length', () => {
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
			// boxA starts narrow (w=50) with overflowing text. After word wrap it widens and shifts
			// left. The arrow fix must use the updated bounds — if it used stale bounds, boxB.x
			// would be ~225 instead of ~249.
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

			expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(154)
			expect(editor.getShape(ids.boxB)!.x).toBeCloseTo(249.61, 1)
		})

		it('does not move endpoint shapes that are outside the provided shapeIds', () => {
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

describe('resolveShapeOverlaps', () => {
	it('separates two overlapping shapes to exactly the required gap', () => {
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.boxB, type: 'geo', x: 50, y: 0, props: { w: 100, h: 100 } },
		])

		resolveShapeOverlaps(editor)

		expect(editor.getShape(ids.boxA)!.x).toBeCloseTo(-35)
		expect(editor.getShape(ids.boxB)!.x).toBeCloseTo(85)
	})

	it('leaves non-overlapping shapes unchanged', () => {
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.boxB, type: 'geo', x: 150, y: 0, props: { w: 100, h: 100 } },
		])

		resolveShapeOverlaps(editor)

		expect(editor.getShape(ids.boxA)!.x).toBe(0)
		expect(editor.getShape(ids.boxB)!.x).toBe(150)
	})

	it('respects a custom padding value', () => {
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

describe('rerouteArrows', () => {
	it('changes the bend of an arrow whose path passes through a bystander shape', () => {
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

describe('cleanupCanvas', () => {
	it('runs all three cleanup passes as a single undoable step', () => {
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

		expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(154)

		editor.undo()

		expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(100)
		expect(editor.getShape(ids.boxB)!.x).toBe(50)
	})

	it('applies word wrap before overlap resolution so overlap uses fresh bounds', () => {
		// boxA grows from w=100 to w=154 after word wrap; boxB at x=120 is now inside the
		// widened boxA, so overlap resolution must use the updated bounds to produce a gap.
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

		expect((editor.getShape(ids.boxA)! as TLGeoShape).props.w).toBe(154)

		const boundsA = editor.getShapePageBounds(editor.getShape(ids.boxA)!)!
		const boundsB = editor.getShapePageBounds(editor.getShape(ids.boxB)!)!
		expect(boundsB.minX - boundsA.maxX).toBeGreaterThanOrEqual(20)
	})
})
