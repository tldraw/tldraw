import { createCustomShapeId, TLShapeId } from '@tldraw/tlschema'
import { TestApp } from '../../test/TestApp'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

const ids = {
	box1: createCustomShapeId('box1'),
	box2: createCustomShapeId('box2'),
	box3: createCustomShapeId('box3'),

	box4: createCustomShapeId('box4'),
	box5: createCustomShapeId('box5'),
	box6: createCustomShapeId('box6'),
}

describe('arrowBindingsIndex', () => {
	it('keeps a mapping from bound shapes to the arrows that bind to them', () => {
		app.createShapes([
			{
				type: 'geo',
				id: ids.box1,
				x: 0,
				y: 0,
				props: {
					w: 100,
					h: 100,
					fill: 'solid',
				},
			},
			{
				type: 'geo',
				id: ids.box2,
				x: 200,
				y: 0,
				props: {
					w: 100,
					h: 100,
					fill: 'solid',
				},
			},
		])

		app.setSelectedTool('arrow')
		app.pointerDown(50, 50).pointerMove(250, 50).pointerUp(250, 50)
		const arrow = app.onlySelectedShape!
		expect(arrow.type).toBe('arrow')

		expect(app.getArrowsBoundTo(ids.box1)).toEqual([{ arrowId: arrow.id, handleId: 'start' }])
		expect(app.getArrowsBoundTo(ids.box2)).toEqual([{ arrowId: arrow.id, handleId: 'end' }])
	})

	it('works if there are many arrows', () => {
		app.createShapes([
			{
				type: 'geo',
				id: ids.box1,
				x: 0,
				y: 0,
				props: {
					w: 100,
					h: 100,
				},
			},
			{
				type: 'geo',
				id: ids.box2,
				x: 200,
				y: 0,
				props: {
					w: 100,
					h: 100,
				},
			},
		])

		app.setSelectedTool('arrow')
		// span both boxes
		app.pointerDown(50, 50).pointerMove(250, 50).pointerUp(250, 50)
		const arrow1 = app.onlySelectedShape!
		expect(arrow1.type).toBe('arrow')

		// start at box 1 and leave
		app.setSelectedTool('arrow')
		app.pointerDown(50, 50).pointerMove(50, -50).pointerUp(50, -50)
		const arrow2 = app.onlySelectedShape!
		expect(arrow2.type).toBe('arrow')

		// start outside box 1 and enter
		app.setSelectedTool('arrow')
		app.pointerDown(50, -50).pointerMove(50, 50).pointerUp(50, 50)
		const arrow3 = app.onlySelectedShape!
		expect(arrow3.type).toBe('arrow')

		// start at box 2 and leave
		app.setSelectedTool('arrow')
		app.pointerDown(250, 50).pointerMove(250, -50).pointerUp(250, -50)
		const arrow4 = app.onlySelectedShape!
		expect(arrow4.type).toBe('arrow')

		// start outside box 2 and enter
		app.setSelectedTool('arrow')
		app.pointerDown(250, -50).pointerMove(250, 50).pointerUp(250, 50)
		const arrow5 = app.onlySelectedShape!
		expect(arrow5.type).toBe('arrow')

		expect(app.getArrowsBoundTo(ids.box1)).toEqual([
			{ arrowId: arrow1.id, handleId: 'start' },
			{ arrowId: arrow2.id, handleId: 'start' },
			{ arrowId: arrow3.id, handleId: 'end' },
		])

		expect(app.getArrowsBoundTo(ids.box2)).toEqual([
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
		beforeEach(() => {
			app.createShapes([
				{
					type: 'geo',
					id: ids.box1,
					x: 0,
					y: 0,
					props: {
						w: 100,
						h: 100,
					},
				},
				{
					type: 'geo',
					id: ids.box2,
					x: 200,
					y: 0,
					props: {
						w: 100,
						h: 100,
					},
				},
			])

			// span both boxes
			app.setSelectedTool('arrow')
			app.pointerDown(50, 50).pointerMove(250, 50).pointerUp(250, 50)
			arrowAId = app.onlySelectedShape!.id
			// start at box 1 and leave
			app.setSelectedTool('arrow')
			app.pointerDown(50, 50).pointerMove(50, -50).pointerUp(50, -50)
			arrowBId = app.onlySelectedShape!.id
			// start outside box 1 and enter
			app.setSelectedTool('arrow')
			app.pointerDown(50, -50).pointerMove(50, 50).pointerUp(50, 50)
			arrowCId = app.onlySelectedShape!.id
			// start at box 2 and leave
			app.setSelectedTool('arrow')
			app.pointerDown(250, 50).pointerMove(250, -50).pointerUp(250, -50)
			arrowDId = app.onlySelectedShape!.id
			// start outside box 2 and enter
			app.setSelectedTool('arrow')
			app.pointerDown(250, -50).pointerMove(250, 50).pointerUp(250, 50)
			arrowEId = app.onlySelectedShape!.id
		})
		it('deletes the entry if you delete the bound shapes', () => {
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			app.deleteShapes([ids.box2])
			expect(app.getArrowsBoundTo(ids.box2)).toEqual([])
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(3)
		})
		it('deletes the entry if you delete an arrow', () => {
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			app.deleteShapes([arrowEId])
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(2)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			app.deleteShapes([arrowDId])
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(1)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			app.deleteShapes([arrowCId])
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(1)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(2)

			app.deleteShapes([arrowBId])
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(1)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(1)

			app.deleteShapes([arrowAId])
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(0)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(0)
		})

		it('deletes the entries in a batch too', () => {
			app.deleteShapes([arrowAId, arrowBId, arrowCId, arrowDId, arrowEId])

			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(0)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(0)
		})

		it('adds new entries after initial creation', () => {
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			// draw from box 2 to box 1
			app.setSelectedTool('arrow')
			app.pointerDown(250, 50).pointerMove(50, 50).pointerUp(50, 50)
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(4)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(4)

			// create a new box

			app.createShapes([
				{
					type: 'geo',
					id: ids.box3,
					x: 400,
					y: 0,
					props: {
						w: 100,
						h: 100,
					},
				},
			])

			// draw from box 2 to box 3

			app.setSelectedTool('arrow')
			app.pointerDown(250, 50).pointerMove(450, 50).pointerUp(450, 50)
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(5)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(4)
			expect(app.getArrowsBoundTo(ids.box3)).toHaveLength(1)
		})

		it('works when copy pasting', () => {
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			app.selectAll()
			app.duplicateShapes()

			const [box1Clone, box2Clone] = app.selectedShapes
				.filter((s) => s.type === 'geo')
				.sort((a, b) => a.x - b.x)

			expect(app.getArrowsBoundTo(box2Clone.id)).toHaveLength(3)
			expect(app.getArrowsBoundTo(box1Clone.id)).toHaveLength(3)
		})

		it('allows bound shapes to be moved', () => {
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			app.nudgeShapes([ids.box2], { x: 0, y: -1 }, true)

			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(3)
		})

		it('allows the arrows bound shape to change', () => {
			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(3)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(3)

			// create another box

			app.createShapes([
				{
					type: 'geo',
					id: ids.box3,
					x: 400,
					y: 0,
					props: {
						w: 100,
						h: 100,
					},
				},
			])

			// move arrowA from box2 to box3
			app.updateShapes([
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

			expect(app.getArrowsBoundTo(ids.box2)).toHaveLength(2)
			expect(app.getArrowsBoundTo(ids.box1)).toHaveLength(3)
			expect(app.getArrowsBoundTo(ids.box3)).toHaveLength(1)
		})
	})
})
