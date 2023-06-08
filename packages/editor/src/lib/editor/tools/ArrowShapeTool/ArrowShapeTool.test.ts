import { Vec2d } from '@tldraw/primitives'
import { createShapeId } from '@tldraw/tlschema'
import { TestEditor } from '../../../test/TestEditor'

let editor: TestEditor

global.requestAnimationFrame = function requestAnimationFrame(cb) {
	return setTimeout(cb, 1000 / 60)
}

global.cancelAnimationFrame = function cancelAnimationFrame(id) {
	clearTimeout(id)
}

jest.useFakeTimers()

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor
		.selectAll()
		.deleteShapes()
		.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
			{ id: ids.box3, type: 'geo', x: 350, y: 350, props: { w: 100, h: 100 } }, // overlapping box2
		])
})

it('enters the arrow state', () => {
	editor.setSelectedTool('arrow')
	expect(editor.currentToolId).toBe('arrow')
	editor.expectPathToBe('root.arrow.idle')
})

describe('When in the idle state', () => {
	it('enters the pointing state and creates a shape on pointer down', () => {
		const shapesBefore = editor.shapesArray.length
		editor.setSelectedTool('arrow').pointerDown(0, 0, { target: 'canvas' })
		const shapesAfter = editor.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore + 1)
		editor.expectPathToBe('root.arrow.pointing')
	})

	it('returns to select on cancel', () => {
		editor.setSelectedTool('arrow')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})
})

describe('When in the pointing state', () => {
	it('cancels on pointer up', () => {
		const shapesBefore = editor.shapesArray.length
		editor.setSelectedTool('arrow').pointerDown(0, 0, { target: 'canvas' }).pointerUp(0, 0)
		const shapesAfter = editor.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore)
		expect(editor.hintingIds.length).toBe(0)
		editor.expectPathToBe('root.arrow.idle')
	})

	it('bails on cancel', () => {
		const shapesBefore = editor.shapesArray.length
		editor.setSelectedTool('arrow').pointerDown(0, 0, { target: 'canvas' }).cancel()
		const shapesAfter = editor.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore)
		expect(editor.hintingIds.length).toBe(0)
		editor.expectPathToBe('root.arrow.idle')
	})

	it('enters the dragging state on pointer move', () => {
		editor.setSelectedTool('arrow').pointerDown(0, 0, { target: 'canvas' }).pointerMove(10, 10)
		editor.expectPathToBe('root.select.dragging_handle')
	})
})

// This could be moved to dragging_handle
describe('When dragging the arrow', () => {
	it('updates the arrow on pointer move', () => {
		editor.setSelectedTool('arrow').pointerDown(0, 0, { target: 'canvas' }).pointerMove(10, 10)
		const arrow = editor.shapesArray[editor.shapesArray.length - 1]
		editor.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: { type: 'point', x: 10, y: 10 },
			},
		})
		editor.expectPathToBe('root.select.dragging_handle')
	})

	it('returns to select.idle, keeping shape, on pointer up', () => {
		const shapesBefore = editor.shapesArray.length
		editor
			.setSelectedTool('arrow')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
		const shapesAfter = editor.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore + 1)
		expect(editor.hintingIds.length).toBe(0)
		editor.expectPathToBe('root.select.idle')
	})

	it('returns to arrow.idle, keeping shape, on pointer up when tool lock is active', () => {
		editor.setToolLocked(true)
		const shapesBefore = editor.shapesArray.length
		editor
			.setSelectedTool('arrow')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
		const shapesAfter = editor.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore + 1)
		expect(editor.hintingIds.length).toBe(0)
		editor.expectPathToBe('root.arrow.idle')
	})

	it('bails on cancel', () => {
		const shapesBefore = editor.shapesArray.length
		editor
			.setSelectedTool('arrow')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.cancel()
		const shapesAfter = editor.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore)
		editor.expectPathToBe('root.arrow.idle')
	})
})

describe('When pointing a start shape', () => {
	it('binds to the top shape', () => {
		editor.setSelectedTool('arrow').pointerDown(375, 375)

		// Set hinting ids when moving away
		expect(editor.hintingIds.length).toBe(1)

		// Fake some velocity
		editor.inputs.pointerVelocity = new Vec2d(1, 1)

		editor.pointerMove(375, 500)

		// Clear hinting ids when moving away
		expect(editor.hintingIds.length).toBe(0)

		const arrow = editor.shapesArray[editor.shapesArray.length - 1]
		editor.expectShapeToMatch(arrow, {
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

		editor.pointerUp()

		// Clear hinting ids on pointer up
		expect(editor.hintingIds.length).toBe(0)
	})
})

describe('When pointing an end shape', () => {
	it('binds to the top shape', () => {
		editor.setSelectedTool('arrow')
		editor.pointerDown(0, 0)

		expect(editor.hintingIds.length).toBe(0)

		// Fake some velocity
		editor.inputs.pointerVelocity = new Vec2d(1, 1)

		// Move onto shape
		editor.pointerMove(375, 375)

		// Set hinting id when pointing the shape
		expect(editor.hintingIds.length).toBe(1)

		const arrow = editor.shapesArray[editor.shapesArray.length - 1]
		editor.expectShapeToMatch(arrow, {
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
		editor.pointerUp()
		expect(editor.hintingIds.length).toBe(0)
	})

	it('unbinds and rebinds', () => {
		editor.setSelectedTool('arrow').pointerDown(0, 0)

		editor.inputs.pointerVelocity = new Vec2d(1, 1)

		editor.pointerMove(375, 375)

		let arrow = editor.shapesArray[editor.shapesArray.length - 1]

		expect(editor.hintingIds.length).toBe(1)

		editor.expectShapeToMatch(arrow, {
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

		arrow = editor.shapesArray[editor.shapesArray.length - 1]

		editor.expectShapeToMatch(arrow, {
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

		editor.pointerMove(375, 0)
		expect(editor.hintingIds.length).toBe(0)
		arrow = editor.shapesArray[editor.shapesArray.length - 1]

		editor.expectShapeToMatch(arrow, {
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
		editor.inputs.pointerVelocity = new Vec2d(1, 1)
		editor.pointerMove(325, 325)
		expect(editor.hintingIds.length).toBe(1)

		arrow = editor.shapesArray[editor.shapesArray.length - 1]

		editor.expectShapeToMatch(arrow, {
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

		arrow = editor.shapesArray[editor.shapesArray.length - 1]

		editor.expectShapeToMatch(arrow, {
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

		editor.pointerUp()
		expect(editor.hintingIds.length).toBe(0)
	})

	it('begins imprecise when moving quickly', () => {
		editor.setSelectedTool('arrow').pointerDown(0, 0)
		editor.inputs.pointerVelocity = new Vec2d(1, 1)
		editor.pointerMove(370, 370)

		const arrow = editor.shapesArray[editor.shapesArray.length - 1]

		expect(editor.hintingIds.length).toBe(1)

		editor.expectShapeToMatch(arrow, {
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
		editor.setSelectedTool('arrow').pointerDown(0, 0)

		let arrow = editor.shapesArray[editor.shapesArray.length - 1]

		editor.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { type: 'point', x: 0, y: 0 },
				end: { type: 'point', x: 0, y: 0 },
			},
		})

		expect(editor.hintingIds.length).toBe(0)

		editor.inputs.pointerVelocity = new Vec2d(0.001, 0.001)
		editor.pointerMove(375, 375)

		arrow = editor.shapesArray[editor.shapesArray.length - 1]

		expect(editor.hintingIds.length).toBe(1)

		editor.expectShapeToMatch(arrow, {
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
		editor.selectAll().deleteShapes()

		// Create an arrow!
		editor.setSelectedTool('arrow')
		editor.pointerDown(0, 0)
		editor.pointerMove(100, 100)
		editor.pointerUp()

		const arrowId = editor.sortedShapesArray[0].id

		// Now create three shapes
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
			{ id: ids.box3, type: 'geo', x: 350, y: 350, props: { w: 100, h: 100 } }, // overlapping box2
		])

		editor.expectShapeToMatch({ id: ids.box1, index: 'a2' })
		editor.expectShapeToMatch({ id: ids.box2, index: 'a3' })
		editor.expectShapeToMatch({ id: ids.box3, index: 'a4' })

		editor.select(arrowId)
		editor.pointerDown(100, 100, {
			target: 'handle',
			handle: { id: 'end', type: 'vertex', index: 'a0', x: 100, y: 100 },
			shape: editor.getShapeById(arrowId)!,
		})
		editor.expectPathToBe('root.select.pointing_handle')

		editor.pointerMove(320, 320) // over box 2
		editor.expectShapeToMatch({ id: arrowId, index: 'a3V' }) // between box 2 (a3) and 3 (a4)

		editor.pointerMove(350, 350) // over box 3
		editor.expectShapeToMatch({ id: arrowId, index: 'a5' }) // above box 3 (a4)

		editor.pointerMove(150, 150) // over box 1
		editor.expectShapeToMatch({ id: arrowId, index: 'a2V' }) // between box 1 (a2) and box 3 (a3)

		editor.pointerMove(-100, -100) // over the page
		editor.expectShapeToMatch({ id: arrowId, index: 'a2V' }) // no change needed, keep whatever we had before

		// todo: should the arrow go back to where it was before?
	})

	it('Correctly sets index when reparenting with multiple arrows', () => {
		editor.selectAll().deleteShapes()

		// create two rectangles:
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
		])

		// create some arrows:
		const arrow1Id = createShapeId('arrow1')
		const arrow2Id = createShapeId('arrow2')

		editor.createShapes([
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
		editor
			.select(arrow1Id)
			.pointerDown(100, 100, {
				target: 'handle',
				handle: { id: 'end', type: 'vertex', index: 'a0', x: 100, y: 100 },
				shape: editor.getShapeById(arrow1Id)!,
			})
			.pointerMove(120, 120)
			.pointerUp()

			.select(arrow2Id)
			.pointerDown(100, 100, {
				target: 'handle',
				handle: { id: 'end', type: 'vertex', index: 'a0', x: 100, y: 100 },
				shape: editor.getShapeById(arrow2Id)!,
			})
			.pointerMove(150, 150)

		const arrow1BoundIndex = editor.getShapeById(arrow1Id)!.index
		const arrow2BoundIndex = editor.getShapeById(arrow2Id)!.index
		expect(arrow1BoundIndex).toBe('a1V')
		expect(arrow2BoundIndex).toBe('a1G')

		// nudge everything around and make sure we all stay in the right order
		editor.selectAll().nudgeShapes(editor.selectedIds, { x: -1, y: 0 })
		expect(editor.getShapeById(arrow1Id)!.index).toBe('a1V')
		expect(editor.getShapeById(arrow2Id)!.index).toBe('a1G')
	})
})
