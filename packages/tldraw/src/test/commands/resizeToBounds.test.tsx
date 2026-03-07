import { Box, TLShapeId, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'
import { TL } from '../test-jsx'

let editor: TestEditor
let ids: Record<string, TLShapeId>

beforeEach(() => {
	editor = new TestEditor()
	editor.selectAll()
	editor.deleteShapes(editor.getSelectedShapeIds())
	ids = editor.createShapesFromJsx([
		<TL.geo ref="boxA" x={0} y={0} w={100} h={100} />,
		<TL.geo ref="boxB" x={200} y={200} w={100} h={100} />,
	])
})

describe('resizeToBounds', () => {
	it('does nothing when no shapes are provided', () => {
		editor.resizeToBounds([], { x: 0, y: 0, w: 500, h: 500 })
	})

	it('resizes shapes to fill the target bounds', () => {
		// Common bounds of boxA and boxB: x=0, y=0, w=300, h=300
		// Target bounds: x=0, y=0, w=600, h=600 (2x scale)
		editor.resizeToBounds([ids.boxA, ids.boxB], new Box(0, 0, 600, 600))

		const boundsA = editor.getShapePageBounds(ids.boxA)!
		const boundsB = editor.getShapePageBounds(ids.boxB)!
		const combined = Box.Common([boundsA, boundsB])!

		expect(combined.x).toBeCloseTo(0)
		expect(combined.y).toBeCloseTo(0)
		expect(combined.w).toBeCloseTo(600)
		expect(combined.h).toBeCloseTo(600)
	})

	it('translates shapes to the target position', () => {
		// Common bounds of boxA and boxB: x=0, y=0, w=300, h=300
		// Target bounds: x=100, y=100, w=300, h=300 (same size, just translate)
		editor.resizeToBounds([ids.boxA, ids.boxB], new Box(100, 100, 300, 300))

		const boundsA = editor.getShapePageBounds(ids.boxA)!
		const boundsB = editor.getShapePageBounds(ids.boxB)!
		const combined = Box.Common([boundsA, boundsB])!

		expect(combined.x).toBeCloseTo(100)
		expect(combined.y).toBeCloseTo(100)
		expect(combined.w).toBeCloseTo(300)
		expect(combined.h).toBeCloseTo(300)
	})

	it('scales and translates together', () => {
		// Target bounds: x=50, y=50, w=150, h=150 (0.5x scale and translate)
		editor.resizeToBounds([ids.boxA, ids.boxB], new Box(50, 50, 150, 150))

		const boundsA = editor.getShapePageBounds(ids.boxA)!
		const boundsB = editor.getShapePageBounds(ids.boxB)!
		const combined = Box.Common([boundsA, boundsB])!

		expect(combined.x).toBeCloseTo(50)
		expect(combined.y).toBeCloseTo(50)
		expect(combined.w).toBeCloseTo(150)
		expect(combined.h).toBeCloseTo(150)
	})

	it('works with a single shape', () => {
		editor.resizeToBounds([ids.boxA], new Box(10, 20, 200, 300))

		const bounds = editor.getShapePageBounds(ids.boxA)!

		expect(bounds.x).toBeCloseTo(10)
		expect(bounds.y).toBeCloseTo(20)
		expect(bounds.w).toBeCloseTo(200)
		expect(bounds.h).toBeCloseTo(300)
	})

	it('is undoable as a single action', () => {
		editor.markHistoryStoppingPoint('before resize')

		editor.resizeToBounds([ids.boxA, ids.boxB], new Box(0, 0, 600, 600))

		// Verify it changed
		const boundsAfter = editor.getShapePageBounds(ids.boxA)!
		expect(boundsAfter.w).toBeCloseTo(200)

		// Undo should restore
		editor.undo()

		editor.expectShapeToMatch(
			{ id: ids.boxA, x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.boxB, x: 200, y: 200, props: { w: 100, h: 100 } }
		)
	})

	it('does nothing on read-only mode', () => {
		editor.updateInstanceState({ isReadonly: true })

		editor.resizeToBounds([ids.boxA, ids.boxB], new Box(0, 0, 600, 600))

		editor.expectShapeToMatch(
			{ id: ids.boxA, x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.boxB, x: 200, y: 200, props: { w: 100, h: 100 } }
		)
	})

	it('skips rotated shapes that are not axis-aligned', () => {
		editor.updateShape({ id: ids.boxA, type: 'geo', rotation: 0.5 })

		editor.resizeToBounds([ids.boxA, ids.boxB], new Box(0, 0, 600, 600))

		// boxA should be unchanged (skipped due to non-90deg rotation)
		editor.expectShapeToMatch({ id: ids.boxA, x: 0, y: 0, props: { w: 100, h: 100 } })

		// boxB should still be resized
		const boundsB = editor.getShapePageBounds(ids.boxB)!
		expect(boundsB.w).not.toBeCloseTo(100)
	})

	it('works with shapes inside a frame', () => {
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())

		const frameIds = editor.createShapesFromJsx([
			<TL.frame ref="frame" x={50} y={50} w={500} h={500}>
				<TL.geo ref="childA" x={0} y={0} w={100} h={100} />
				<TL.geo ref="childB" x={200} y={200} w={100} h={100} />
			</TL.frame>,
		])

		editor.resizeToBounds([frameIds.childA, frameIds.childB], new Box(50, 50, 600, 600))

		const boundsA = editor.getShapePageBounds(frameIds.childA)!
		const boundsB = editor.getShapePageBounds(frameIds.childB)!
		const combined = Box.Common([boundsA, boundsB])!

		expect(combined.x).toBeCloseTo(50)
		expect(combined.y).toBeCloseTo(50)
		expect(combined.w).toBeCloseTo(600)
		expect(combined.h).toBeCloseTo(600)
	})

	it('includes arrow-bound shapes in the same cluster', () => {
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())

		const box1 = createShapeId('box1')
		const box2 = createShapeId('box2')
		const arrow1 = createShapeId('arrow1')

		editor
			.createShapes([
				{ id: box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
				{ id: box2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } },
				{ id: arrow1, type: 'arrow', x: 100, y: 100 },
			])
			.createBindings([
				{
					fromId: arrow1,
					toId: box1,
					type: 'arrow',
					props: {
						terminal: 'start',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: false,
						isPrecise: false,
					},
				},
				{
					fromId: arrow1,
					toId: box2,
					type: 'arrow',
					props: {
						terminal: 'end',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: false,
						isPrecise: false,
					},
				},
			])

		// Resize just box1 — arrow should pull box2 into the same cluster
		editor.resizeToBounds([box1], new Box(0, 0, 600, 600))

		// The arrow-bound cluster should be resized together
		const bounds1 = editor.getShapePageBounds(box1)!
		const bounds2 = editor.getShapePageBounds(box2)!
		const combined = Box.Common([bounds1, bounds2])!

		expect(combined.w).toBeGreaterThan(300)
		expect(combined.h).toBeGreaterThan(300)
	})

	it('resizes arrow-bound clusters to the correct target bounds', () => {
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())

		const box1 = createShapeId('box1')
		const box2 = createShapeId('box2')
		const arrow1 = createShapeId('arrow1')

		editor
			.createShapes([
				{ id: box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
				{ id: box2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } },
				{ id: arrow1, type: 'arrow', x: 100, y: 100 },
			])
			.createBindings([
				{
					fromId: arrow1,
					toId: box1,
					type: 'arrow',
					props: {
						terminal: 'start',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: false,
						isPrecise: false,
					},
				},
				{
					fromId: arrow1,
					toId: box2,
					type: 'arrow',
					props: {
						terminal: 'end',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: false,
						isPrecise: false,
					},
				},
			])

		// Provide both shapes — they should form one cluster with the arrow
		editor.resizeToBounds([box1, box2], new Box(0, 0, 600, 600))

		const bounds1 = editor.getShapePageBounds(box1)!
		const bounds2 = editor.getShapePageBounds(box2)!
		const combined = Box.Common([bounds1, bounds2])!

		expect(combined.x).toBeCloseTo(0)
		expect(combined.y).toBeCloseTo(0)
		expect(combined.w).toBeCloseTo(600)
		expect(combined.h).toBeCloseTo(600)
	})
})
