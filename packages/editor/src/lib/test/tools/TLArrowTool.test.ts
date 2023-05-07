import { Vec2d } from '@tldraw/primitives'
import { createCustomShapeId } from '@tldraw/tlschema'
import { TestApp } from '../TestApp'

let app: TestApp

global.requestAnimationFrame = function requestAnimationFrame(cb) {
	return setTimeout(cb, 1000 / 60)
}

global.cancelAnimationFrame = function cancelAnimationFrame(id) {
	clearTimeout(id)
}

jest.useFakeTimers()

const ids = {
	box1: createCustomShapeId('box1'),
	box2: createCustomShapeId('box2'),
	box3: createCustomShapeId('box3'),
}

beforeEach(() => {
	app = new TestApp()
	app
		.selectAll()
		.deleteShapes()
		.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
			{ id: ids.box3, type: 'geo', x: 350, y: 350, props: { w: 100, h: 100 } }, // overlapping box2
		])
})

it('enters the arrow state', () => {
	app.setSelectedTool('arrow')
	expect(app.currentToolId).toBe('arrow')
	app.expectPathToBe('root.arrow.idle')
})

describe('When in the idle state', () => {
	it('enters the pointing state and creates a shape on pointer down', () => {
		const shapesBefore = app.shapesArray.length
		app.setSelectedTool('arrow').pointerDown(0, 0, { target: 'canvas' })
		const shapesAfter = app.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore + 1)
		app.expectPathToBe('root.arrow.pointing')
	})

	it('returns to select on cancel', () => {
		app.setSelectedTool('arrow')
		app.cancel()
		app.expectToBeIn('select.idle')
	})
})

describe('When in the pointing state', () => {
	it('cancels on pointer up', () => {
		const shapesBefore = app.shapesArray.length
		app.setSelectedTool('arrow').pointerDown(0, 0, { target: 'canvas' }).pointerUp(0, 0)
		const shapesAfter = app.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore)
		expect(app.hintingIds.length).toBe(0)
		app.expectPathToBe('root.arrow.idle')
	})

	it('bails on cancel', () => {
		const shapesBefore = app.shapesArray.length
		app.setSelectedTool('arrow').pointerDown(0, 0, { target: 'canvas' }).cancel()
		const shapesAfter = app.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore)
		expect(app.hintingIds.length).toBe(0)
		app.expectPathToBe('root.arrow.idle')
	})

	it('enters the dragging state on pointer move', () => {
		app.setSelectedTool('arrow').pointerDown(0, 0, { target: 'canvas' }).pointerMove(10, 10)
		app.expectPathToBe('root.select.dragging_handle')
	})
})

// This could be moved to dragging_handle
describe('When dragging the arrow', () => {
	it('updates the arrow on pointer move', () => {
		app.setSelectedTool('arrow').pointerDown(0, 0, { target: 'canvas' }).pointerMove(10, 10)
		const arrow = app.shapesArray[app.shapesArray.length - 1]
		app.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: { type: 'point', x: 10, y: 10 },
			},
		})
		app.expectPathToBe('root.select.dragging_handle')
	})

	it('returns to select.idle, keeping shape, on pointer up', () => {
		const shapesBefore = app.shapesArray.length
		app
			.setSelectedTool('arrow')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
		const shapesAfter = app.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore + 1)
		expect(app.hintingIds.length).toBe(0)
		app.expectPathToBe('root.select.idle')
	})

	it('returns to arrow.idle, keeping shape, on pointer up when tool lock is active', () => {
		app.setToolLocked(true)
		const shapesBefore = app.shapesArray.length
		app
			.setSelectedTool('arrow')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
		const shapesAfter = app.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore + 1)
		expect(app.hintingIds.length).toBe(0)
		app.expectPathToBe('root.arrow.idle')
	})

	it('bails on cancel', () => {
		const shapesBefore = app.shapesArray.length
		app
			.setSelectedTool('arrow')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.cancel()
		const shapesAfter = app.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore)
		app.expectPathToBe('root.arrow.idle')
	})
})

describe('When pointing a start shape', () => {
	it('binds to the top shape', () => {
		app.setSelectedTool('arrow').pointerDown(375, 375)

		// Set hinting ids when moving away
		expect(app.hintingIds.length).toBe(1)

		// Fake some velocity
		app.inputs.pointerVelocity = new Vec2d(1, 1)

		app.pointerMove(375, 500)

		// Clear hinting ids when moving away
		expect(app.hintingIds.length).toBe(0)

		const arrow = app.shapesArray[app.shapesArray.length - 1]
		app.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 375,
			y: 375,
			props: {
				start: {
					type: 'binding',
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 }, // center!
					boundShapeId: ids.box3,
				},
				end: { type: 'point', x: 0, y: 125 },
			},
		})

		app.pointerUp()

		// Clear hinting ids on pointer up
		expect(app.hintingIds.length).toBe(0)
	})
})

describe('When pointing an end shape', () => {
	it('binds to the top shape', () => {
		app.setSelectedTool('arrow')
		app.pointerDown(0, 0)

		expect(app.hintingIds.length).toBe(0)

		// Fake some velocity
		app.inputs.pointerVelocity = new Vec2d(1, 1)

		// Move onto shape
		app.pointerMove(375, 375)

		// Set hinting id when pointing the shape
		expect(app.hintingIds.length).toBe(1)

		const arrow = app.shapesArray[app.shapesArray.length - 1]
		app.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: {
					type: 'binding',
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 }, // center!
					boundShapeId: ids.box3,
				},
			},
		})

		// Clear hinting ids on pointer up
		app.pointerUp()
		expect(app.hintingIds.length).toBe(0)
	})

	it('unbinds and rebinds', () => {
		app.setSelectedTool('arrow').pointerDown(0, 0)

		app.inputs.pointerVelocity = new Vec2d(1, 1)

		app.pointerMove(375, 375)

		let arrow = app.shapesArray[app.shapesArray.length - 1]

		expect(app.hintingIds.length).toBe(1)

		app.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: {
					type: 'binding',
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					boundShapeId: ids.box3,
				},
			},
		})

		jest.advanceTimersByTime(1000)

		arrow = app.shapesArray[app.shapesArray.length - 1]

		app.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: {
					type: 'binding',
					isExact: false,
					normalizedAnchor: { x: 0.25, y: 0.25 },
					boundShapeId: ids.box3,
				},
			},
		})

		app.pointerMove(375, 0)
		expect(app.hintingIds.length).toBe(0)
		arrow = app.shapesArray[app.shapesArray.length - 1]

		app.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: { type: 'point', x: 375, y: 0 },
			},
		})

		// Build up some velocity
		app.inputs.pointerVelocity = new Vec2d(1, 1)
		app.pointerMove(325, 325)
		expect(app.hintingIds.length).toBe(1)

		arrow = app.shapesArray[app.shapesArray.length - 1]

		app.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: {
					type: 'binding',
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 }, // center!
					boundShapeId: ids.box2,
				},
			},
		})

		// Give time for the velocity to die down
		jest.advanceTimersByTime(1000)

		arrow = app.shapesArray[app.shapesArray.length - 1]

		app.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: {
					type: 'binding',
					isExact: false,
					normalizedAnchor: { x: 0.25, y: 0.25 }, // precise!
					boundShapeId: ids.box2,
				},
			},
		})

		app.pointerUp()
		expect(app.hintingIds.length).toBe(0)
	})

	it('begins imprecise when moving quickly', () => {
		app.setSelectedTool('arrow').pointerDown(0, 0)
		app.inputs.pointerVelocity = new Vec2d(1, 1)
		app.pointerMove(370, 370)

		const arrow = app.shapesArray[app.shapesArray.length - 1]

		expect(app.hintingIds.length).toBe(1)

		app.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: {
					type: 'binding',
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					boundShapeId: ids.box3,
				},
			},
		})
	})

	it('begins precise when moving slowly', () => {
		app.setSelectedTool('arrow').pointerDown(0, 0)

		let arrow = app.shapesArray[app.shapesArray.length - 1]

		app.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: { type: 'point', x: 0, y: 0 },
			},
		})

		expect(app.hintingIds.length).toBe(0)

		app.inputs.pointerVelocity = new Vec2d(0.001, 0.001)
		app.pointerMove(375, 375)

		arrow = app.shapesArray[app.shapesArray.length - 1]

		expect(app.hintingIds.length).toBe(1)

		app.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: {
					type: 'binding',
					isExact: false,
					normalizedAnchor: { x: 0.25, y: 0.25 },
					boundShapeId: ids.box3,
				},
			},
		})
	})
})

describe('reparenting issue', () => {
	it('Correctly sets index when reparenting', () => {
		app.selectAll().deleteShapes()

		// Create an arrow!
		app.setSelectedTool('arrow')
		app.pointerDown(0, 0)
		app.pointerMove(100, 100)
		app.pointerUp()

		const arrowId = app.sortedShapesArray[0].id

		// Now create three shapes
		app.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
			{ id: ids.box3, type: 'geo', x: 350, y: 350, props: { w: 100, h: 100 } }, // overlapping box2
		])

		app.expectShapeToMatch({ id: ids.box1, index: 'a2' })
		app.expectShapeToMatch({ id: ids.box2, index: 'a3' })
		app.expectShapeToMatch({ id: ids.box3, index: 'a4' })

		app.select(arrowId)
		app.pointerDown(100, 100, {
			target: 'handle',
			handle: { id: 'end', type: 'vertex', index: 'a0', x: 100, y: 100 },
			shape: app.getShapeById(arrowId)!,
		})
		app.expectPathToBe('root.select.pointing_handle')

		app.pointerMove(320, 320) // over box 2
		app.expectShapeToMatch({ id: arrowId, index: 'a3V' }) // between box 2 (a3) and 3 (a4)

		app.pointerMove(350, 350) // over box 3
		app.expectShapeToMatch({ id: arrowId, index: 'a5' }) // above box 3 (a4)

		app.pointerMove(150, 150) // over box 1
		app.expectShapeToMatch({ id: arrowId, index: 'a2V' }) // between box 1 (a2) and box 3 (a3)

		app.pointerMove(-100, -100) // over the page
		app.expectShapeToMatch({ id: arrowId, index: 'a2V' }) // no change needed, keep whatever we had before

		// todo: should the arrow go back to where it was before?
	})

	it('Correctly sets index when reparenting with multiple arrows', () => {
		app.selectAll().deleteShapes()

		// create two rectangles:
		app.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
		])

		// create some arrows:
		const arrow1Id = createCustomShapeId('arrow1')
		const arrow2Id = createCustomShapeId('arrow2')

		app.createShapes([
			{
				id: arrow1Id,
				type: 'arrow',
				x: 0,
				y: 0,
				props: { start: { type: 'point', x: 0, y: 0 }, end: { type: 'point', x: 100, y: 100 } },
			},
			{
				id: arrow2Id,
				type: 'arrow',
				x: 0,
				y: 0,
				props: { start: { type: 'point', x: 0, y: 0 }, end: { type: 'point', x: 100, y: 100 } },
			},
		])

		// bind arrows to boxes:
		app
			.select(arrow1Id)
			.pointerDown(100, 100, {
				target: 'handle',
				handle: { id: 'end', type: 'vertex', index: 'a0', x: 100, y: 100 },
				shape: app.getShapeById(arrow1Id)!,
			})
			.pointerMove(120, 120)
			.pointerUp()

			.select(arrow2Id)
			.pointerDown(100, 100, {
				target: 'handle',
				handle: { id: 'end', type: 'vertex', index: 'a0', x: 100, y: 100 },
				shape: app.getShapeById(arrow2Id)!,
			})
			.pointerMove(150, 150)

		const arrow1BoundIndex = app.getShapeById(arrow1Id)!.index
		const arrow2BoundIndex = app.getShapeById(arrow2Id)!.index
		expect(arrow1BoundIndex).toBe('a1V')
		expect(arrow2BoundIndex).toBe('a1G')

		// nudge everything around and make sure we all stay in the right order
		app.selectAll().nudgeShapes(app.selectedIds, { x: -1, y: 0 })
		expect(app.getShapeById(arrow1Id)!.index).toBe('a1V')
		expect(app.getShapeById(arrow2Id)!.index).toBe('a1G')
	})
})
