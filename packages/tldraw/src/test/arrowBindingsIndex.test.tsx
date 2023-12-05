import { TLArrowShape, TLGeoShape, TLShapeId, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('arrowBindingsIndex', () => {
	it('keeps a mapping from bound shapes to the arrows that bind to them', () => {
		const ids = editor.createShapesFromJsx([
			<TL.geo ref="box1" x={0} y={0} w={100} h={100} fill="solid" />,
			<TL.geo ref="box2" x={200} y={0} w={100} h={100} fill="solid" />,
		])

		editor.selectNone()
		editor.setCurrentTool('arrow')
		editor.pointerDown(50, 50)
		expect(editor.getOnlySelectedShape()).toBe(null)
		expect(editor.getArrowsBoundTo(ids.box1)).toEqual([])

		editor.pointerMove(50, 55)
		expect(editor.getOnlySelectedShape()).not.toBe(null)
		const arrow = editor.getOnlySelectedShape()!
		expect(arrow.type).toBe('arrow')
		expect(editor.getArrowsBoundTo(ids.box1)).toEqual([
			{ arrowId: arrow.id, handleId: 'start' },
			{ arrowId: arrow.id, handleId: 'end' },
		])

		editor.pointerMove(250, 50)
		expect(editor.getArrowsBoundTo(ids.box1)).toEqual([{ arrowId: arrow.id, handleId: 'start' }])
		expect(editor.getArrowsBoundTo(ids.box2)).toEqual([{ arrowId: arrow.id, handleId: 'end' }])
	})

	it('works if there are many arrows', () => {
		const ids = {
			box1: createShapeId('box1'),
			box2: createShapeId('box2'),
		}

		editor.createShapes([
			{ type: 'geo', id: ids.box1, x: 0, y: 0, props: { w: 100, h: 100 } },
			{ type: 'geo', id: ids.box2, x: 200, y: 0, props: { w: 100, h: 100 } },
		])

		editor.setCurrentTool('arrow')
		// start at box 1 and end on box 2
		editor.pointerDown(50, 50)

		expect(editor.getArrowsBoundTo(ids.box1)).toEqual([])

		editor.pointerMove(250, 50)
		const arrow1 = editor.getOnlySelectedShape()!
		expect(arrow1.type).toBe('arrow')

		expect(editor.getArrowsBoundTo(ids.box1)).toEqual([{ arrowId: arrow1.id, handleId: 'start' }])
		expect(editor.getArrowsBoundTo(ids.box2)).toEqual([{ arrowId: arrow1.id, handleId: 'end' }])

		editor.pointerUp()

		expect(editor.getArrowsBoundTo(ids.box1)).toEqual([{ arrowId: arrow1.id, handleId: 'start' }])
		expect(editor.getArrowsBoundTo(ids.box2)).toEqual([{ arrowId: arrow1.id, handleId: 'end' }])

		// start at box 1 and end on the page
		editor.setCurrentTool('arrow')
		editor.pointerMove(50, 50).pointerDown().pointerMove(50, -50).pointerUp()
		const arrow2 = editor.getOnlySelectedShape()!
		expect(arrow2.type).toBe('arrow')

		expect(editor.getArrowsBoundTo(ids.box1)).toEqual([
			{ arrowId: arrow1.id, handleId: 'start' },
			{ arrowId: arrow2.id, handleId: 'start' },
		])

		// start outside box 1 and end in box 1
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, -50).pointerMove(50, 50).pointerUp(50, 50)
		const arrow3 = editor.getOnlySelectedShape()!
		expect(arrow3.type).toBe('arrow')

		expect(editor.getArrowsBoundTo(ids.box1)).toEqual([
			{ arrowId: arrow1.id, handleId: 'start' },
			{ arrowId: arrow2.id, handleId: 'start' },
			{ arrowId: arrow3.id, handleId: 'end' },
		])

		expect(editor.getArrowsBoundTo(ids.box2)).toEqual([{ arrowId: arrow1.id, handleId: 'end' }])

		// start at box 2 and end on the page
		editor.selectNone()
		editor.setCurrentTool('arrow')
		editor.pointerDown(250, 50)
		editor.expectToBeIn('arrow.pointing')
		editor.pointerMove(250, -50)
		editor.expectToBeIn('select.dragging_handle')
		const arrow4 = editor.getOnlySelectedShape()!

		expect(editor.getArrowsBoundTo(ids.box2)).toEqual([
			{ arrowId: arrow1.id, handleId: 'end' },
			{ arrowId: arrow4.id, handleId: 'start' },
		])

		editor.pointerUp(250, -50)
		editor.expectToBeIn('select.idle')
		expect(arrow4.type).toBe('arrow')

		expect(editor.getArrowsBoundTo(ids.box2)).toEqual([
			{ arrowId: arrow1.id, handleId: 'end' },
			{ arrowId: arrow4.id, handleId: 'start' },
		])

		// start outside box 2 and enter in box 2
		editor.setCurrentTool('arrow')
		editor.pointerDown(250, -50).pointerMove(250, 50).pointerUp(250, 50)
		const arrow5 = editor.getOnlySelectedShape()!
		expect(arrow5.type).toBe('arrow')

		expect(editor.getArrowsBoundTo(ids.box1)).toEqual([
			{ arrowId: arrow1.id, handleId: 'start' },
			{ arrowId: arrow2.id, handleId: 'start' },
			{ arrowId: arrow3.id, handleId: 'end' },
		])

		expect(editor.getArrowsBoundTo(ids.box2)).toEqual([
			{ arrowId: arrow1.id, handleId: 'end' },
			{ arrowId: arrow4.id, handleId: 'start' },
			{ arrowId: arrow5.id, handleId: 'end' },
		])
	})

	describe('updating shapes', () => {
		//     ▲ │              │  ▲
		//     │ │              │  │
		//     b c              e  d
		// ┌───┼─┴─┐         ┌──┴──┼─┐
		// │   │ ▼ │         │  ▼  │ │
		// │   └───┼─────a───┼───► │ │
		// │ 1     │         │ 2     │
		// └───────┘         └───────┘
		let arrowAId: TLShapeId
		let arrowBId: TLShapeId
		let arrowCId: TLShapeId
		let arrowDId: TLShapeId
		let arrowEId: TLShapeId
		let ids: Record<string, TLShapeId>
		beforeEach(() => {
			ids = editor.createShapesFromJsx([
				<TL.geo ref="box1" x={0} y={0} w={100} h={100} />,
				<TL.geo ref="box2" x={200} y={0} w={100} h={100} />,
			])

			// span both boxes
			editor.setCurrentTool('arrow')
			editor.pointerDown(50, 50).pointerMove(250, 50).pointerUp(250, 50)
			arrowAId = editor.getOnlySelectedShape()!.id
			// start at box 1 and leave
			editor.setCurrentTool('arrow')
			editor.pointerDown(50, 50).pointerMove(50, -50).pointerUp(50, -50)
			arrowBId = editor.getOnlySelectedShape()!.id
			// start outside box 1 and enter
			editor.setCurrentTool('arrow')
			editor.pointerDown(50, -50).pointerMove(50, 50).pointerUp(50, 50)
			arrowCId = editor.getOnlySelectedShape()!.id
			// start at box 2 and leave
			editor.setCurrentTool('arrow')
			editor.pointerDown(250, 50).pointerMove(250, -50).pointerUp(250, -50)
			arrowDId = editor.getOnlySelectedShape()!.id
			// start outside box 2 and enter
			editor.setCurrentTool('arrow')
			editor.pointerDown(250, -50).pointerMove(250, 50).pointerUp(250, 50)
			arrowEId = editor.getOnlySelectedShape()!.id
		})
		it('deletes the entry if you delete the bound shapes', () => {
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			editor.deleteShapes([ids.box2])
			expect(editor.getArrowsBoundTo(ids.box2)).toEqual([])
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)
		})
		it('deletes the entry if you delete an arrow', () => {
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			editor.deleteShapes([arrowEId])
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(2)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			editor.deleteShapes([arrowDId])
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(1)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			editor.deleteShapes([arrowCId])
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(1)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(2)

			editor.deleteShapes([arrowBId])
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(1)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(1)

			editor.deleteShapes([arrowAId])
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(0)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(0)
		})

		it('deletes the entries in a batch too', () => {
			editor.deleteShapes([arrowAId, arrowBId, arrowCId, arrowDId, arrowEId])

			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(0)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(0)
		})

		it('adds new entries after initial creation', () => {
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			// draw from box 2 to box 1
			editor.setCurrentTool('arrow')
			editor.pointerDown(250, 50).pointerMove(50, 50).pointerUp(50, 50)
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(4)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(4)

			// create a new box

			const { box3 } = editor.createShapesFromJsx(
				<TL.geo ref="box3" x={400} y={0} w={100} h={100} />
			)

			// draw from box 2 to box 3

			editor.setCurrentTool('arrow')
			editor.pointerDown(250, 50).pointerMove(450, 50).pointerUp(450, 50)
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(5)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(4)
			expect(editor.getArrowsBoundTo(box3)).toHaveLength(1)
		})

		it('works when copy pasting', () => {
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			editor.selectAll()
			editor.duplicateShapes(editor.getSelectedShapeIds())

			const [box1Clone, box2Clone] = editor
				.getSelectedShapes()
				.filter((shape) => editor.isShapeOfType<TLGeoShape>(shape, 'geo'))
				.sort((a, b) => a.x - b.x)

			expect(editor.getArrowsBoundTo(box2Clone.id)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(box1Clone.id)).toHaveLength(3)
		})

		it('allows bound shapes to be moved', () => {
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			editor.nudgeShapes([ids.box2], { x: 0, y: -1 })

			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)
		})

		it('allows the arrows bound shape to change', () => {
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			// create another box

			const { box3 } = editor.createShapesFromJsx(
				<TL.geo ref="box3" x={400} y={0} w={100} h={100} />
			)

			// move arrowA from box2 to box3
			editor.updateShapes<TLArrowShape>([
				{
					id: arrowAId,
					type: 'arrow',
					props: {
						end: {
							type: 'binding',
							isExact: false,
							boundShapeId: box3,
							normalizedAnchor: { x: 0.5, y: 0.5 },
							isPrecise: false,
						},
					},
				},
			])

			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(2)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(box3)).toHaveLength(1)
		})
	})
})
