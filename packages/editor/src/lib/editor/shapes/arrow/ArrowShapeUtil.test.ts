import { TAU } from '@tldraw/primitives'
import { TLArrowShape, TLArrowShapeTerminal, TLShapeId, createShapeId } from '@tldraw/tlschema'
import { assert } from '@tldraw/utils'
import { TestEditor } from '../../../test/TestEditor'
import { ArrowShapeUtil } from './ArrowShapeUtil'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	arrow1: createShapeId('arrow1'),
}

jest.useFakeTimers()

window.requestAnimationFrame = function requestAnimationFrame(cb) {
	return setTimeout(cb, 1000 / 60)
}

window.cancelAnimationFrame = function cancelAnimationFrame(id) {
	clearTimeout(id)
}

beforeEach(() => {
	editor = new TestEditor()
	editor
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
		editor.select(ids.box2)
		editor.pointerDown(250, 250, { target: 'shape', shape: editor.getShapeById(ids.box2) })
		editor.pointerMove(300, 300) // move box 2 by 50, 50
		editor.expectShapeToMatch({
			id: ids.box2,
			x: 350,
			y: 350,
		})
		editor.expectShapeToMatch({
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
		editor.updateShapes([{ id: ids.arrow1, type: 'arrow', props: { bend: 20 } }])
		editor.select(ids.box2)
		editor.pointerDown(250, 250, { target: 'shape', shape: editor.getShapeById(ids.box2) })
		editor.pointerMove(300, 300) // move box 2 by 50, 50
		editor.expectShapeToMatch({
			id: ids.box2,
			x: 350,
			y: 350,
		})
		editor.expectShapeToMatch({
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
		editor.select(ids.arrow1)
		editor.pointerDown(200, 200, { target: 'shape', shape: editor.getShapeById(ids.arrow1)! })
		editor.pointerMove(200, 190)
		editor.expectShapeToMatch({
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
		editor.select(ids.arrow1, ids.box2)
		expect(editor.selectedPageBounds).toMatchObject({
			x: 200,
			y: 200,
			w: 200,
			h: 200,
		})
		editor.pointerDown(300, 300, { target: 'selection' })
		editor.pointerMove(300, 250)
		editor.expectShapeToMatch({
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
		editor.select(ids.arrow1, ids.box2)

		// When box one is not selected, unbinds box1 and keeps binding to box2
		editor.nudgeShapes(editor.selectedIds, { x: 0, y: -1 })

		expect(editor.getShapeById(ids.arrow1)).toMatchObject({
			props: {
				start: { type: 'binding', boundShapeId: ids.box1 },
				end: { type: 'binding', boundShapeId: ids.box2 },
			},
		})

		// unbinds when only the arrow is selected (not its bound shapes)
		editor.select(ids.arrow1)
		editor.nudgeShapes(editor.selectedIds, { x: 0, y: -1 })

		expect(editor.getShapeById(ids.arrow1)).toMatchObject({
			props: { start: { type: 'point' }, end: { type: 'point' } },
		})
	})

	it('align', () => {
		editor.createShapes([{ id: ids.box3, type: 'geo', x: 500, y: 300, props: { w: 100, h: 100 } }])

		// When box one is not selected, unbinds box1 and keeps binding to box2
		editor.select(ids.arrow1, ids.box2, ids.box3)
		editor.alignShapes('right')
		jest.advanceTimersByTime(1000)

		expect(editor.getShapeById(ids.arrow1)).toMatchObject({
			props: {
				start: { type: 'binding', boundShapeId: ids.box1 },
				end: { type: 'binding', boundShapeId: ids.box2 },
			},
		})

		// unbinds when only the arrow is selected (not its bound shapes)
		editor.select(ids.arrow1, ids.box3)
		editor.alignShapes('top')
		jest.advanceTimersByTime(1000)

		expect(editor.getShapeById(ids.arrow1)).toMatchObject({
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
		editor.createShapes([
			{ id: ids.box3, type: 'geo', x: 0, y: 300, props: { w: 100, h: 100 } },
			{ id: ids.box4, type: 'geo', x: 0, y: 600, props: { w: 100, h: 100 } },
		])

		// When box one is not selected, unbinds box1 and keeps binding to box2
		editor.select(ids.arrow1, ids.box2, ids.box3)
		editor.distributeShapes('horizontal')
		jest.advanceTimersByTime(1000)

		expect(editor.getShapeById(ids.arrow1)).toMatchObject({
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
		editor.select(ids.arrow1, ids.box3, ids.box4)
		editor.distributeShapes('vertical')
		jest.advanceTimersByTime(1000)

		// The arrow didn't actually move
		expect(editor.getShapeById(ids.arrow1)).toMatchObject({
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
		editor.updateShapes([{ id: ids.box4, type: 'geo', y: -600 }])
		editor.distributeShapes('vertical')
		jest.advanceTimersByTime(1000)

		expect(editor.getShapeById(ids.arrow1)).toMatchObject({
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
		editor
			.selectAll()
			.deleteShapes()
			.createShapes([
				{ id: ids.box3, type: 'geo', x: 0, y: 300, props: { w: 100, h: 100 } },
				{ id: ids.box4, type: 'geo', x: 0, y: 600, props: { w: 100, h: 100 } },
			])
			.selectAll()
			.groupShapes()

		editor.setSelectedTool('arrow').pointerDown(1000, 1000).pointerMove(50, 350).pointerUp(50, 350)
		let arrow = editor.shapesArray[editor.shapesArray.length - 1]
		assert(editor.isShapeOfType(arrow, ArrowShapeUtil))
		assert(arrow.props.end.type === 'binding')
		expect(arrow.props.end.boundShapeId).toBe(ids.box3)

		// translate:
		editor.selectAll().nudgeShapes(editor.selectedIds, { x: 0, y: 1 })

		// arrow should still be bound to box3
		arrow = editor.getShapeById(arrow.id)!
		assert(editor.isShapeOfType(arrow, ArrowShapeUtil))
		assert(arrow.props.end.type === 'binding')
		expect(arrow.props.end.boundShapeId).toBe(ids.box3)
	})
})

describe('When a shape it rotated', () => {
	it('binds correctly', () => {
		editor.setSelectedTool('arrow').pointerDown(0, 0).pointerMove(375, 375)

		const arrow = editor.shapesArray[editor.shapesArray.length - 1]

		expect(editor.getShapeById(arrow.id)).toMatchObject({
			props: {
				start: { type: 'point' },
				end: {
					type: 'binding',
					boundShapeId: ids.box2,
					normalizedAnchor: { x: 0.75, y: 0.75 }, // moving slowly
				},
			},
		})

		editor.updateShapes([{ id: ids.box2, type: 'geo', rotation: TAU }])

		editor.pointerMove(225, 350)

		expect(editor.getShapeById(arrow.id)).toMatchObject({
			props: {
				start: { type: 'point' },
				end: { type: 'binding', boundShapeId: ids.box2 },
			},
		})

		const anchor = (
			editor.getShapeById<TLArrowShape>(arrow.id)!.props.end as TLArrowShapeTerminal & {
				type: 'binding'
			}
		).normalizedAnchor
		expect(anchor.x).toBeCloseTo(0.5)
		expect(anchor.y).toBeCloseTo(0.75)
	})
})

describe('resizing', () => {
	it('resizes', () => {
		editor
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

		const arrow1 = editor.shapesArray.at(-2)!
		const arrow2 = editor.shapesArray.at(-1)!

		editor
			.select(arrow1.id, arrow2.id)
			.pointerDown(150, 300, { target: 'selection', handle: 'bottom' })
			.pointerMove(150, 600)

			.expectPathToBe('root.select.resizing')

		expect(editor.getShapeById(arrow1.id)).toMatchObject({
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

		expect(editor.getShapeById(arrow2.id)).toMatchObject({
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
		editor
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

		const arrow1 = editor.shapesArray.at(-2)!
		const arrow2 = editor.shapesArray.at(-1)!

		editor.updateShapes([{ id: arrow1.id, type: 'arrow', props: { bend: 50 } }])

		editor
			.select(arrow1.id, arrow2.id)
			.pointerDown(150, 300, { target: 'selection', handle: 'bottom' })
			.pointerMove(150, -300)

			.expectPathToBe('root.select.resizing')

		expect(editor.getShapeById(arrow1.id)).toCloselyMatchObject({
			props: {
				bend: -50,
			},
		})

		expect(editor.getShapeById(arrow2.id)).toCloselyMatchObject({
			props: {
				bend: 0,
			},
		})

		editor.pointerMove(150, 300)

		expect(editor.getShapeById(arrow1.id)).toCloselyMatchObject({
			props: {
				bend: 50,
			},
		})

		expect(editor.getShapeById(arrow2.id)).toCloselyMatchObject({
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
		editor.selectAll().deleteShapes()

		editor.setSelectedTool('frame')
		editor.pointerDown(0, 0).pointerMove(100, 100).pointerUp()
		frameId = editor.onlySelectedShape!.id

		editor.setSelectedTool('geo')
		editor.pointerDown(10, 10).pointerMove(20, 20).pointerUp()
		boxAid = editor.onlySelectedShape!.id
		editor.setSelectedTool('geo')
		editor.pointerDown(10, 80).pointerMove(20, 90).pointerUp()
		boxBid = editor.onlySelectedShape!.id
		editor.setSelectedTool('geo')
		editor.pointerDown(110, 10).pointerMove(120, 20).pointerUp()
		boxCid = editor.onlySelectedShape!.id
	})

	it("are updated when the arrow's bound shapes change", () => {
		// draw arrow from a to empty space within frame, but don't pointer up yet
		editor.setSelectedTool('arrow')
		editor.pointerDown(15, 15).pointerMove(50, 50)
		const arrowId = editor.onlySelectedShape!.id

		expect(editor.getShapeById(arrowId)).toMatchObject({
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: frameId },
			},
		})
		expect(editor.getShapeById(arrowId)?.parentId).toBe(editor.currentPageId)

		// move arrow to b
		editor.pointerMove(15, 85)
		expect(editor.getShapeById(arrowId)?.parentId).toBe(frameId)
		expect(editor.getShapeById(arrowId)).toMatchObject({
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: boxBid },
			},
		})

		// move back to empty space
		editor.pointerMove(50, 50)
		expect(editor.getShapeById(arrowId)?.parentId).toBe(editor.currentPageId)
		expect(editor.getShapeById(arrowId)).toMatchObject({
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: frameId },
			},
		})
	})

	it('reparents when one of the shapes is moved outside of the frame', () => {
		// draw arrow from a to b
		editor.setSelectedTool('arrow')
		editor.pointerDown(15, 15).pointerMove(15, 85).pointerUp()
		const arrowId = editor.onlySelectedShape!.id

		expect(editor.getShapeById(arrowId)).toMatchObject({
			parentId: frameId,
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: boxBid },
			},
		})
		// move b outside of frame
		editor.select(boxBid).translateSelection(200, 0)
		expect(editor.getShapeById(arrowId)).toMatchObject({
			parentId: editor.currentPageId,
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: boxBid },
			},
		})
	})

	it('reparents to the frame when an arrow created outside has both its parents moved inside', () => {
		// draw arrow from a to c
		editor.setSelectedTool('arrow')
		editor.pointerDown(15, 15).pointerMove(115, 15).pointerUp()
		const arrowId = editor.onlySelectedShape!.id
		expect(editor.getShapeById(arrowId)).toMatchObject({
			parentId: editor.currentPageId,
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: boxCid },
			},
		})

		// move c inside of frame
		editor.select(boxCid).translateSelection(-40, 0)

		expect(editor.getShapeById(arrowId)).toMatchObject({
			parentId: frameId,
			props: {
				start: { type: 'binding', boundShapeId: boxAid },
				end: { type: 'binding', boundShapeId: boxCid },
			},
		})
	})
})
