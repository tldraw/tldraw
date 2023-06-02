import { TAU } from '@tldraw/primitives'
import { createCustomShapeId, TLArrowShape, TLArrowTerminal, TLShapeId } from '@tldraw/tlschema'
import { assert } from '@tldraw/utils'
import { TestEditor } from '../../../test/TestEditor'
import { TLArrowUtil } from './TLArrowUtil'

let app: TestEditor

const ids = {
	box1: createCustomShapeId('box1'),
	box2: createCustomShapeId('box2'),
	box3: createCustomShapeId('box3'),
	box4: createCustomShapeId('box4'),
	arrow1: createCustomShapeId('arrow1'),
}

jest.useFakeTimers()

window.requestAnimationFrame = function requestAnimationFrame(cb) {
	return setTimeout(cb, 1000 / 60)
}

window.cancelAnimationFrame = function cancelAnimationFrame(id) {
	clearTimeout(id)
}

beforeEach(() => {
	app = new TestEditor()
	app
		.selectAll()
		.deleteShapes()
		.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
			{
				id: ids.arrow1,
				type: 'arrow',
				x: 150,
				y: 150,
				props: {
					start: {
						type: 'binding',
						isExact: false,
						boundShapeId: ids.box1,
						normalizedAnchor: { x: 0.5, y: 0.5 },
					},
					end: {
						type: 'binding',
						isExact: false,
						boundShapeId: ids.box2,
						normalizedAnchor: { x: 0.5, y: 0.5 },
					},
				},
			},
		])
})

describe('When translating a bound shape', () => {
	it('updates the arrow when straight', () => {
		app.select(ids.box2)
		app.pointerDown(250, 250, { target: 'shape', shape: app.getShapeById(ids.box2) })
		app.pointerMove(300, 300) // move box 2 by 50, 50
		app.expectShapeToMatch({
			id: ids.box2,
			x: 350,
			y: 350,
		})
		app.expectShapeToMatch({
			id: ids.arrow1,
			type: 'arrow',
			x: 150,
			y: 150,
			props: {
				start: {
					type: 'binding',
					isExact: false,
					boundShapeId: ids.box1,
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
				end: {
					type: 'binding',
					isExact: false,
					boundShapeId: ids.box2,
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
			},
		})
	})

	it('updates the arrow when curved', () => {
		app.updateShapes([{ id: ids.arrow1, type: 'arrow', props: { bend: 20 } }])
		app.select(ids.box2)
		app.pointerDown(250, 250, { target: 'shape', shape: app.getShapeById(ids.box2) })
		app.pointerMove(300, 300) // move box 2 by 50, 50
		app.expectShapeToMatch({
			id: ids.box2,
			x: 350,
			y: 350,
		})
		app.expectShapeToMatch({
			id: ids.arrow1,
			type: 'arrow',
			x: 150,
			y: 150,
			props: {
				start: {
					type: 'binding',
					isExact: false,
					boundShapeId: ids.box1,
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
				end: {
					type: 'binding',
					isExact: false,
					boundShapeId: ids.box2,
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
			},
		})
	})
})

describe('When translating the arrow', () => {
	it('unbinds all handles if neither bound shape is not also translating', () => {
		app.select(ids.arrow1)
		app.pointerDown(200, 200, { target: 'shape', shape: app.getShapeById(ids.arrow1)! })
		app.pointerMove(200, 190)
		app.expectShapeToMatch({
			id: ids.arrow1,
			type: 'arrow',
			x: 150,
			y: 140,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: { type: 'point', x: 200, y: 200 },
			},
		})
	})

	it('retains all handles if either bound shape is also translating', () => {
		app.select(ids.arrow1, ids.box2)
		expect(app.selectedPageBounds).toMatchObject({
			x: 200,
			y: 200,
			w: 200,
			h: 200,
		})
		app.pointerDown(300, 300, { target: 'selection' })
		app.pointerMove(300, 250)
		app.expectShapeToMatch({
			id: ids.arrow1,
			type: 'arrow',
			x: 150,
			y: 100,
			props: {
				start: {
					type: 'binding',
					isExact: false,
					boundShapeId: ids.box1,
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
				end: {
					type: 'binding',
					isExact: false,
					boundShapeId: ids.box2,
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
			},
		})
	})
})

describe('Other cases when arrow are moved', () => {
	it('nudge', () => {
		app.select(ids.arrow1, ids.box2)

		// When box one is not selected, unbinds box1 and keeps binding to box2
		app.nudgeShapes(app.selectedIds, { x: 0, y: -1 })

		expect(app.getShapeById(ids.arrow1)).toMatchObject({
			props: {
				start: { type: 'binding', boundShapeId: ids.box1 },
				end: { type: 'binding', boundShapeId: ids.box2 },
			},
		})

		// unbinds when only the arrow is selected (not its bound shapes)
		app.select(ids.arrow1)
		app.nudgeShapes(app.selectedIds, { x: 0, y: -1 })

		expect(app.getShapeById(ids.arrow1)).toMatchObject({
			props: { start: { type: 'point' }, end: { type: 'point' } },
		})
	})

	it('align', () => {
		app.createShapes([{ id: ids.box3, type: 'geo', x: 500, y: 300, props: { w: 100, h: 100 } }])

		// When box one is not selected, unbinds box1 and keeps binding to box2
		app.select(ids.arrow1, ids.box2, ids.box3)
		app.alignShapes('right')
		jest.advanceTimersByTime(1000)

		expect(app.getShapeById(ids.arrow1)).toMatchObject({
			props: {
				start: { type: 'binding', boundShapeId: ids.box1 },
				end: { type: 'binding', boundShapeId: ids.box2 },
			},
		})

		// unbinds when only the arrow is selected (not its bound shapes)
		app.select(ids.arrow1, ids.box3)
		app.alignShapes('top')
		jest.advanceTimersByTime(1000)

		expect(app.getShapeById(ids.arrow1)).toMatchObject({
			props: {
				start: {
					type: 'point',
				},
				end: {
					type: 'point',
				},
			},
		})
	})

	it('distribute', () => {
		app.createShapes([
			{ id: ids.box3, type: 'geo', x: 0, y: 300, props: { w: 100, h: 100 } },
			{ id: ids.box4, type: 'geo', x: 0, y: 600, props: { w: 100, h: 100 } },
		])

		// When box one is not selected, unbinds box1 and keeps binding to box2
		app.select(ids.arrow1, ids.box2, ids.box3)
		app.distributeShapes('horizontal')
		jest.advanceTimersByTime(1000)

		expect(app.getShapeById(ids.arrow1)).toMatchObject({
			props: {
				start: {
					type: 'binding',
					boundShapeId: ids.box1,
				},
				end: {
					type: 'binding',
					boundShapeId: ids.box2,
				},
			},
		})

		// unbinds when only the arrow is selected (not its bound shapes) if the arrow itself has moved
		app.select(ids.arrow1, ids.box3, ids.box4)
		app.distributeShapes('vertical')
		jest.advanceTimersByTime(1000)

		// The arrow didn't actually move
		expect(app.getShapeById(ids.arrow1)).toMatchObject({
			props: {
				start: {
					type: 'binding',
					boundShapeId: ids.box1,
				},
				end: {
					type: 'binding',
					boundShapeId: ids.box2,
				},
			},
		})

		// The arrow will move this time, so it should unbind
		app.updateShapes([{ id: ids.box4, type: 'geo', y: -600 }])
		app.distributeShapes('vertical')
		jest.advanceTimersByTime(1000)

		expect(app.getShapeById(ids.arrow1)).toMatchObject({
			props: {
				start: {
					type: 'point',
				},
				end: {
					type: 'point',
				},
			},
		})
	})

	it('when translating with a group that the arrow is bound into', () => {
		// create shapes in a group:
		app
			.selectAll()
			.deleteShapes()
			.createShapes([
				{ id: ids.box3, type: 'geo', x: 0, y: 300, props: { w: 100, h: 100 } },
				{ id: ids.box4, type: 'geo', x: 0, y: 600, props: { w: 100, h: 100 } },
			])
			.selectAll()
			.groupShapes()

		app.setSelectedTool('arrow').pointerDown(1000, 1000).pointerMove(50, 350).pointerUp(50, 350)
		let arrow = app.shapesArray[app.shapesArray.length - 1]
		assert(app.isShapeOfType(arrow, TLArrowUtil))
		assert(arrow.props.end.type === 'binding')
		expect(arrow.props.end.boundShapeId).toBe(ids.box3)

		// translate:
		app.selectAll().nudgeShapes(app.selectedIds, { x: 0, y: 1 })

		// arrow should still be bound to box3
		arrow = app.getShapeById(arrow.id)!
		assert(app.isShapeOfType(arrow, TLArrowUtil))
		assert(arrow.props.end.type === 'binding')
		expect(arrow.props.end.boundShapeId).toBe(ids.box3)
	})
})

describe('When a shape it rotated', () => {
	it('binds correctly', () => {
		app.setSelectedTool('arrow').pointerDown(0, 0).pointerMove(375, 375)

		const arrow = app.shapesArray[app.shapesArray.length - 1]

		expect(app.getShapeById(arrow.id)).toMatchObject({
			props: {
				start: { type: 'point' },
				end: {
					type: 'binding',
					boundShapeId: ids.box2,
					normalizedAnchor: { x: 0.75, y: 0.75 }, // moving slowly
				},
			},
		})

		app.updateShapes([{ id: ids.box2, type: 'geo', rotation: TAU }])

		app.pointerMove(225, 350)

		expect(app.getShapeById(arrow.id)).toMatchObject({
			props: {
				start: { type: 'point' },
				end: { type: 'binding', boundShapeId: ids.box2 },
			},
		})

		const anchor = (
			app.getShapeById<TLArrowShape>(arrow.id)!.props.end as TLArrowTerminal & { type: 'binding' }
		).normalizedAnchor
		expect(anchor.x).toBeCloseTo(0.5)
		expect(anchor.y).toBeCloseTo(0.75)
	})
})

describe('resizing', () => {
	it('resizes', () => {
		app
			.selectAll()
			.deleteShapes()
			.setSelectedTool('arrow')
			.pointerDown(0, 0)
			.pointerMove(200, 200)
			.pointerUp()
			.setSelectedTool('arrow')
			.pointerDown(100, 100)
			.pointerMove(300, 300)
			.pointerUp()
			.setSelectedTool('select')

		const arrow1 = app.shapesArray.at(-2)!
		const arrow2 = app.shapesArray.at(-1)!

		app
			.select(arrow1.id, arrow2.id)
			.pointerDown(150, 300, { target: 'selection', handle: 'bottom' })
			.pointerMove(150, 600)

			.expectPathToBe('root.select.resizing')

		expect(app.getShapeById(arrow1.id)).toMatchObject({
			x: 0,
			y: 0,
			props: {
				start: {
					x: 0,
					y: 0,
				},
				end: {
					x: 200,
					y: 400,
				},
			},
		})

		expect(app.getShapeById(arrow2.id)).toMatchObject({
			x: 100,
			y: 200,
			props: {
				start: {
					x: 0,
					y: 0,
				},
				end: {
					x: 200,
					y: 400,
				},
			},
		})
	})

	it('flips bend when flipping x or y', () => {
		app
			.selectAll()
			.deleteShapes()
			.setSelectedTool('arrow')
			.pointerDown(0, 0)
			.pointerMove(200, 200)
			.pointerUp()
			.setSelectedTool('arrow')
			.pointerDown(100, 100)
			.pointerMove(300, 300)
			.pointerUp()
			.setSelectedTool('select')

		const arrow1 = app.shapesArray.at(-2)!
		const arrow2 = app.shapesArray.at(-1)!

		app.updateShapes([{ id: arrow1.id, type: 'arrow', props: { bend: 50 } }])

		app
			.select(arrow1.id, arrow2.id)
			.pointerDown(150, 300, { target: 'selection', handle: 'bottom' })
			.pointerMove(150, -300)

			.expectPathToBe('root.select.resizing')

		expect(app.getShapeById(arrow1.id)).toCloselyMatchObject({
			props: {
				bend: -50,
			},
		})

		expect(app.getShapeById(arrow2.id)).toCloselyMatchObject({
			props: {
				bend: 0,
			},
		})

		app.pointerMove(150, 300)

		expect(app.getShapeById(arrow1.id)).toCloselyMatchObject({
			props: {
				bend: 50,
			},
		})

		expect(app.getShapeById(arrow2.id)).toCloselyMatchObject({
			props: {
				bend: 0,
			},
		})
	})
})

describe("an arrow's parents", () => {
	// Frame
	// ┌───────────────────┐
	// │ ┌────┐            │ ┌────┐
	// │ │ A  │            │ │ C  │
	// │ └────┘            │ └────┘
	// │                   │
	// │                   │
	// │ ┌────┐            │
	// │ │ B  │            │
	// │ └────┘            │
	// └───────────────────┘
	let frameId: TLShapeId
	let boxAid: TLShapeId
	let boxBid: TLShapeId
	let boxCid: TLShapeId

	beforeEach(() => {
		app.selectAll().deleteShapes()

		app.setSelectedTool('frame')
		app.pointerDown(0, 0).pointerMove(100, 100).pointerUp()
		frameId = app.onlySelectedShape!.id

		app.setSelectedTool('geo')
		app.pointerDown(10, 10).pointerMove(20, 20).pointerUp()
		boxAid = app.onlySelectedShape!.id
		app.setSelectedTool('geo')
		app.pointerDown(10, 80).pointerMove(20, 90).pointerUp()
		boxBid = app.onlySelectedShape!.id
		app.setSelectedTool('geo')
		app.pointerDown(110, 10).pointerMove(120, 20).pointerUp()
		boxCid = app.onlySelectedShape!.id
	})

	it("are updated when the arrow's bound shapes change", () => {
		// draw arrow from a to empty space within frame, but don't pointer up yet
		app.setSelectedTool('arrow')
		app.pointerDown(15, 15).pointerMove(50, 50)
		const arrowId = app.onlySelectedShape!.id

		expect(app.getShapeById(arrowId)).toMatchObject({
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: frameId },
			},
		})
		expect(app.getShapeById(arrowId)?.parentId).toBe(app.currentPageId)

		// move arrow to b
		app.pointerMove(15, 85)
		expect(app.getShapeById(arrowId)?.parentId).toBe(frameId)
		expect(app.getShapeById(arrowId)).toMatchObject({
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: boxBid },
			},
		})

		// move back to empty space
		app.pointerMove(50, 50)
		expect(app.getShapeById(arrowId)?.parentId).toBe(app.currentPageId)
		expect(app.getShapeById(arrowId)).toMatchObject({
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: frameId },
			},
		})
	})

	it('reparents when one of the shapes is moved outside of the frame', () => {
		// draw arrow from a to b
		app.setSelectedTool('arrow')
		app.pointerDown(15, 15).pointerMove(15, 85).pointerUp()
		const arrowId = app.onlySelectedShape!.id

		expect(app.getShapeById(arrowId)).toMatchObject({
			parentId: frameId,
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: boxBid },
			},
		})
		// move b outside of frame
		app.select(boxBid).translateSelection(200, 0)
		expect(app.getShapeById(arrowId)).toMatchObject({
			parentId: app.currentPageId,
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: boxBid },
			},
		})
	})

	it('reparents to the frame when an arrow created outside has both its parents moved inside', () => {
		// draw arrow from a to c
		app.setSelectedTool('arrow')
		app.pointerDown(15, 15).pointerMove(115, 15).pointerUp()
		const arrowId = app.onlySelectedShape!.id
		expect(app.getShapeById(arrowId)).toMatchObject({
			parentId: app.currentPageId,
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: boxCid },
			},
		})

		// move c inside of frame
		app.select(boxCid).translateSelection(-40, 0)

		expect(app.getShapeById(arrowId)).toMatchObject({
			parentId: frameId,
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: boxCid },
			},
		})
	})
})
