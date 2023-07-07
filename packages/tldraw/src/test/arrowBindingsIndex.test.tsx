import { TLArrowShape, TLGeoShape, TLShapeId, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
}

describe('arrowBindingsIndex', () => {
	it('keeps a mapping from bound shapes to the arrows that bind to them', () => {
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, fill: 'solid' },
			},
			{
				id: ids.box2,
				type: 'geo',
				x: 200,
				y: 0,
				props: { w: 100, h: 100, fill: 'solid' },
			},
		])

		editor.setSelectedTool('arrow')
		editor.pointerDown(50, 50).pointerMove(250, 50).pointerUp(250, 50)
		const arrow = editor.onlySelectedShape!
		expect(arrow.type).toBe('arrow')

		expect(editor.getArrowsBoundTo(ids.box1)).toEqual([{ arrowId: arrow.id, handleId: 'start' }])
		expect(editor.getArrowsBoundTo(ids.box2)).toEqual([{ arrowId: arrow.id, handleId: 'end' }])
	})

	it('works if there are many arrows', () => {
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } },
		])

		editor.setSelectedTool('arrow')
		// span both boxes
		editor.pointerDown(50, 50).pointerMove(250, 50).pointerUp(250, 50)
		const arrow1 = editor.onlySelectedShape!
		expect(arrow1.type).toBe('arrow')

		// start at box 1 and leave
		editor.setSelectedTool('arrow')
		editor.pointerDown(50, 50).pointerMove(50, -50).pointerUp(50, -50)
		const arrow2 = editor.onlySelectedShape!
		expect(arrow2.type).toBe('arrow')

		// start outside box 1 and enter
		editor.setSelectedTool('arrow')
		editor.pointerDown(50, -50).pointerMove(50, 50).pointerUp(50, 50)
		const arrow3 = editor.onlySelectedShape!
		expect(arrow3.type).toBe('arrow')

		// start at box 2 and leave
		editor.setSelectedTool('arrow')
		editor.pointerDown(250, 50).pointerMove(250, -50).pointerUp(250, -50)
		const arrow4 = editor.onlySelectedShape!
		expect(arrow4.type).toBe('arrow')

		// start outside box 2 and enter
		editor.setSelectedTool('arrow')
		editor.pointerDown(250, -50).pointerMove(250, 50).pointerUp(250, 50)
		const arrow5 = editor.onlySelectedShape!
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
			editor.createShapes([
				{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
				{ id: ids.box1, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } },
			])

			// span both boxes
			editor.setSelectedTool('arrow')
			editor.pointerDown(50, 50).pointerMove(250, 50).pointerUp(250, 50)
			arrowAId = editor.onlySelectedShape!.id
			// start at box 1 and leave
			editor.setSelectedTool('arrow')
			editor.pointerDown(50, 50).pointerMove(50, -50).pointerUp(50, -50)
			arrowBId = editor.onlySelectedShape!.id
			// start outside box 1 and enter
			editor.setSelectedTool('arrow')
			editor.pointerDown(50, -50).pointerMove(50, 50).pointerUp(50, 50)
			arrowCId = editor.onlySelectedShape!.id
			// start at box 2 and leave
			editor.setSelectedTool('arrow')
			editor.pointerDown(250, 50).pointerMove(250, -50).pointerUp(250, -50)
			arrowDId = editor.onlySelectedShape!.id
			// start outside box 2 and enter
			editor.setSelectedTool('arrow')
			editor.pointerDown(250, -50).pointerMove(250, 50).pointerUp(250, 50)
			arrowEId = editor.onlySelectedShape!.id
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
			editor.setSelectedTool('arrow')
			editor.pointerDown(250, 50).pointerMove(50, 50).pointerUp(50, 50)
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(4)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(4)
			// create a new box

			editor.createShapes([
				{
					id: ids.box3,
					type: 'geo',
					x: 400,
					y: 0,
					props: { w: 100, h: 100 },
				},
			])

			// draw from box 2 to box 3

			editor.setSelectedTool('arrow')
			editor.pointerDown(250, 50).pointerMove(450, 50).pointerUp(450, 50)
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(5)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(4)
			expect(editor.getArrowsBoundTo(ids.box3)).toHaveLength(1)
		})

		it('works when copy pasting', () => {
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			editor.selectAll()
			editor.duplicateShapes()

			const [box1Clone, box2Clone] = editor.selectedShapes
				.filter((shape) => editor.isShapeOfType<TLGeoShape>(shape, 'geo'))
				.sort((a, b) => a.x - b.x)

			expect(editor.getArrowsBoundTo(box2Clone.id)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(box1Clone.id)).toHaveLength(3)
		})

		it('allows bound shapes to be moved', () => {
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			editor.nudgeShapes([ids.box2], { x: 0, y: -1 }, true)

			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)
		})

		it('allows the arrows bound shape to change', () => {
			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			// create another box

			editor.createShapes([{ id: ids.box3, type: 'geo', x: 400, y: 0, props: { w: 100, h: 100 } }])

			// move arrowA from box2 to box3
			editor.updateShapes<TLArrowShape>([
				{
					id: arrowAId,
					type: 'arrow',
					props: {
						end: {
							type: 'binding',
							isExact: false,
							boundShapeId: ids.box3,
							normalizedAnchor: { x: 0.5, y: 0.5 },
						},
					},
				},
			])

			expect(editor.getArrowsBoundTo(ids.box2)).toHaveLength(2)
			expect(editor.getArrowsBoundTo(ids.box1)).toHaveLength(3)
			expect(editor.getArrowsBoundTo(ids.box3)).toHaveLength(1)
		})
	})
})
