import { IndexKey, TLArrowShape, TLShapeId, Vec, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'
import { defaultShapeUtils } from '../../defaultShapeUtils'
import { ArrowShapeUtil } from './ArrowShapeUtil'
import { getArrowTargetState } from './arrowTargetState'
import { getArrowBindings } from './shared'

let editor: TestEditor

global.requestAnimationFrame = function requestAnimationFrame(cb) {
	return setTimeout(cb, 1000 / 60)
}

global.cancelAnimationFrame = function cancelAnimationFrame(id) {
	clearTimeout(id)
}

vi.useFakeTimers()

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
}

function bindings(id: TLShapeId) {
	return getArrowBindings(editor, editor.getShape(id) as TLArrowShape)
}

function init(opts?: ConstructorParameters<typeof TestEditor>[0]) {
	editor = new TestEditor(opts)
	editor
		.selectAll()
		.deleteShapes(editor.getSelectedShapeIds())
		.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
			{ id: ids.box3, type: 'geo', x: 350, y: 350, props: { w: 50, h: 50 } }, // overlapping box2, but smaller!
		])
}

beforeEach(init)

it('enters the arrow state', () => {
	editor.setCurrentTool('arrow')
	expect(editor.getCurrentToolId()).toBe('arrow')
	editor.expectToBeIn('arrow.idle')
})

describe('When in the idle state', () => {
	it('enters the pointing state and creates a shape on pointer down', () => {
		const shapesBefore = editor.getCurrentPageShapes().length
		editor.setCurrentTool('arrow').pointerDown(0, 0)
		const shapesAfter = editor.getCurrentPageShapes().length
		expect(shapesAfter).toBe(shapesBefore + 1)
		editor.expectToBeIn('arrow.pointing')
	})

	it('returns to select on cancel', () => {
		editor.setCurrentTool('arrow')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})
})

describe('When in the pointing state', () => {
	it('cancels on pointer up', () => {
		const shapesBefore = editor.getCurrentPageShapes().length
		editor.setCurrentTool('arrow').pointerDown(0, 0).pointerUp(0, 0)
		const shapesAfter = editor.getCurrentPageShapes().length
		expect(shapesAfter).toBe(shapesBefore)
		expect(editor.getHintingShapeIds().length).toBe(0)
		editor.expectToBeIn('arrow.idle')
	})

	it('bails on cancel', () => {
		const shapesBefore = editor.getCurrentPageShapes().length
		editor.setCurrentTool('arrow').pointerDown(0, 0).cancel()
		const shapesAfter = editor.getCurrentPageShapes().length
		expect(shapesAfter).toBe(shapesBefore)
		expect(editor.getHintingShapeIds().length).toBe(0)
		editor.expectToBeIn('arrow.idle')
	})

	it('enters the dragging state on pointer move', () => {
		editor.setCurrentTool('arrow').pointerDown(0, 0).pointerMove(10, 10)
		editor.expectToBeIn('select.dragging_handle')
	})
})

// This could be moved to dragging_handle
describe('When dragging the arrow', () => {
	it('updates the arrow on pointer move', () => {
		editor.setCurrentTool('arrow').pointerDown(0, 0).pointerMove(10, 10)
		const arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		editor.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { x: 0, y: 0 },
				end: { x: 10, y: 10 },
			},
		})
		expect(bindings(arrow.id)).toMatchObject({ start: undefined, end: undefined })
		editor.expectToBeIn('select.dragging_handle')
	})

	it('returns to select.idle, keeping shape, on pointer up', () => {
		const shapesBefore = editor.getCurrentPageShapes().length
		editor.setCurrentTool('arrow').pointerDown(0, 0).pointerMove(10, 10).pointerUp(10, 10)
		const shapesAfter = editor.getCurrentPageShapes().length
		expect(shapesAfter).toBe(shapesBefore + 1)
		expect(editor.getHintingShapeIds().length).toBe(0)
		editor.expectToBeIn('select.idle')
	})

	it('returns to arrow.idle, keeping shape, on pointer up when tool lock is active', () => {
		editor.updateInstanceState({ isToolLocked: true })
		const shapesBefore = editor.getCurrentPageShapes().length
		editor.setCurrentTool('arrow').pointerDown(0, 0).pointerMove(10, 10).pointerUp(10, 10)
		const shapesAfter = editor.getCurrentPageShapes().length
		expect(shapesAfter).toBe(shapesBefore + 1)
		expect(editor.getHintingShapeIds().length).toBe(0)
		editor.expectToBeIn('arrow.idle')
	})

	it('bails on cancel', () => {
		const shapesBefore = editor.getCurrentPageShapes().length
		editor.setCurrentTool('arrow').pointerDown(0, 0).pointerMove(10, 10).cancel()
		const shapesAfter = editor.getCurrentPageShapes().length
		expect(shapesAfter).toBe(shapesBefore)
		editor.expectToBeIn('arrow.idle')
	})
})

describe('When pointing a start shape', () => {
	it('binds to the top shape', () => {
		editor.setCurrentTool('arrow').pointerDown(375, 375)

		// Set hinting ids when moving away
		expect(getArrowTargetState(editor)).not.toBeNull()

		// Fake some velocity
		editor.inputs.pointerVelocity = new Vec(1, 1)

		editor.pointerMove(375, 500)

		// Clear hinting ids when moving away
		expect(getArrowTargetState(editor)).toBeNull()

		const arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		editor.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 375,
			y: 375,
			props: {
				start: { x: 0, y: 0 },
				end: { x: 0, y: 125 },
			},
		})
		expect(bindings(arrow.id)).toMatchObject({
			start: {
				toId: ids.box3,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 }, // center!
					isPrecise: false,
				},
			},
			end: undefined,
		})

		editor.pointerUp()

		// Clear hinting ids on pointer up
		expect(editor.getHintingShapeIds().length).toBe(0)
	})
})

describe('When pointing an end shape', () => {
	it('binds to the top shape', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 0)

		expect(editor.getHintingShapeIds().length).toBe(0)

		// Fake some velocity
		editor.inputs.pointerVelocity = new Vec(1, 1)

		// Move onto shape
		editor.pointerMove(375, 375)

		// Set hinting id when pointing the shape
		expect(getArrowTargetState(editor)).not.toBeNull()

		const arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		editor.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { x: 0, y: 0 },
			},
		})
		expect(bindings(arrow.id)).toMatchObject({
			start: undefined,
			end: {
				toId: ids.box3,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 }, // center!
					isPrecise: false,
				},
			},
		})

		// Clear hinting ids on pointer up
		editor.pointerUp()
		expect(getArrowTargetState(editor)).toBeNull()
	})

	it('unbinds and rebinds', () => {
		editor.setCurrentTool('arrow').pointerDown(0, 0)

		editor.inputs.pointerVelocity = new Vec(1, 1)

		editor.pointerMove(375, 375)

		let arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]

		expect(getArrowTargetState(editor)).not.toBeNull()

		expect(bindings(arrow.id)).toMatchObject({
			start: undefined,
			end: {
				toId: ids.box3,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
		})

		vi.advanceTimersByTime(1000)

		arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]

		expect(bindings(arrow.id)).toMatchObject({
			start: undefined,
			end: {
				toId: ids.box3,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: true,
				},
			},
		})

		editor.pointerMove(375, 0)
		expect(getArrowTargetState(editor)).toBeNull()
		arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]

		editor.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { x: 0, y: 0 },
				end: { x: 375, y: 0 },
			},
		})
		expect(bindings(arrow.id)).toMatchObject({
			start: undefined,
			end: undefined,
		})

		// Build up some velocity
		editor.inputs.pointerVelocity = new Vec(1, 1)
		editor.pointerMove(325, 325)
		expect(getArrowTargetState(editor)).not.toBeNull()

		arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]

		editor.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { x: 0, y: 0 },
			},
		})
		expect(bindings(arrow.id)).toMatchObject({
			start: undefined,
			end: {
				toId: ids.box2,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 }, // center!
					isPrecise: false,
				},
			},
		})

		// Give time for the velocity to die down
		vi.advanceTimersByTime(1000)

		arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]

		expect(bindings(arrow.id)).toMatchObject({
			start: undefined,
			end: {
				toId: ids.box2,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.25, y: 0.25 }, // precise!
					isPrecise: true,
				},
			},
		})

		editor.pointerUp()
		expect(getArrowTargetState(editor)).toBeNull()
	})

	it('respects shouldIgnoreTargets option when ctrl key is held', () => {
		editor.setCurrentTool('arrow')

		// Test without ctrl key - should bind normally
		editor.pointerDown(0, 0)
		editor.pointerMove(375, 375) // Move to box3

		let arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		expect(bindings(arrow.id)).toMatchObject({
			end: {
				toId: ids.box3,
			},
		})

		editor.pointerUp()
		editor.setCurrentTool('arrow')

		// Test with ctrl key - should not bind
		editor.keyDown('Control')
		editor.pointerDown(0, 0)
		editor.pointerMove(375, 375) // Move to box3

		arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		expect(bindings(arrow.id)).toMatchObject({
			end: undefined,
		})

		editor.pointerUp()
		editor.keyUp('Control')
	})

	it('respects shouldBeExact option when alt key is held', () => {
		editor.setCurrentTool('arrow')

		// Test without alt key - should not be exact
		editor.pointerDown(0, 0)
		editor.pointerMove(375, 375) // Move to box3

		let arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		expect(bindings(arrow.id)).toMatchObject({
			end: {
				toId: ids.box3,
				props: {
					isExact: false,
				},
			},
		})

		editor.pointerUp()
		editor.setCurrentTool('arrow')

		// Test with alt key - should be exact
		editor.keyDown('Alt')
		editor.pointerDown(0, 0)
		editor.pointerMove(375, 375) // Move to box3

		arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		expect(bindings(arrow.id)).toMatchObject({
			end: {
				toId: ids.box3,
				props: {
					isExact: true,
				},
			},
		})

		editor.pointerUp()
		editor.keyUp('Alt')
	})

	it('begins imprecise when moving quickly', () => {
		editor.setCurrentTool('arrow').pointerDown(0, 0)
		editor.inputs.pointerVelocity = new Vec(1, 1)
		editor.pointerMove(370, 370)

		const arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]

		expect(getArrowTargetState(editor)).not.toBeNull()

		expect(bindings(arrow.id)).toMatchObject({
			start: undefined,
			end: {
				toId: ids.box3,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
		})
	})

	it('begins precise when moving slowly', () => {
		editor.setCurrentTool('arrow').pointerDown(0, 0)

		let arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]

		expect(bindings(arrow.id)).toMatchObject({
			start: undefined,
			end: undefined,
		})

		expect(getArrowTargetState(editor)).toBeNull()

		editor.inputs.pointerVelocity = new Vec(0.001, 0.001)
		editor.pointerMove(375, 375)

		arrow = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]

		expect(getArrowTargetState(editor)).not.toBeNull()

		editor.expectShapeToMatch(arrow, {
			id: arrow.id,
			type: 'arrow',
			x: 0,
			y: 0,
		})
		expect(bindings(arrow.id)).toMatchObject({
			start: undefined,
			end: {
				toId: ids.box3,
				props: {
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: true,
				},
			},
		})
	})
})

describe('reparenting issue', () => {
	it('Correctly sets index when reparenting', () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

		// Create an arrow!
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 0)
		editor.pointerMove(100, 100)
		editor.pointerUp()

		const arrowId = editor.getCurrentPageShapesSorted()[0].id

		// Now create three shapes
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
			{ id: ids.box3, type: 'geo', x: 350, y: 350, props: { w: 90, h: 90 } }, // overlapping box2
		])

		editor.expectShapeToMatch({ id: ids.box1, index: 'a2' as IndexKey })
		editor.expectShapeToMatch({ id: ids.box2, index: 'a3' as IndexKey })
		editor.expectShapeToMatch({ id: ids.box3, index: 'a4' as IndexKey })

		editor.select(arrowId)
		editor.pointerDown(100, 100, {
			target: 'handle',
			handle: { id: 'end', type: 'vertex', index: 'a0' as IndexKey, x: 100, y: 100 },
			shape: editor.getShape(arrowId)!,
		})
		editor.expectToBeIn('select.pointing_handle')

		editor.pointerMove(320, 320) // over box 2
		editor.expectToBeIn('select.dragging_handle')
		editor.expectShapeToMatch({
			id: arrowId,
			index: 'a3V' as IndexKey,
		}) // between box 2 (a3) and 3 (a4)
		expect(bindings(arrowId)).toMatchObject({ end: { toId: ids.box2 } })

		expect(editor.getShapeAtPoint({ x: 350, y: 350 }, { hitInside: true })).toMatchObject({
			id: ids.box3,
		})

		editor.pointerMove(350, 350) // over box 3 and box 2, but box 3 is smaller
		editor.expectShapeToMatch({
			id: arrowId,
			index: 'a5' as IndexKey,
		}) // above box 3 (a4)
		expect(bindings(arrowId)).toMatchObject({ end: { toId: ids.box3 } })

		editor.pointerMove(150, 150) // over box 1
		editor.expectShapeToMatch({ id: arrowId, index: 'a2V' as IndexKey }) // between box 1 (a2) and box 3 (a3)

		editor.pointerMove(-100, -100) // over the page
		editor.expectShapeToMatch({ id: arrowId, index: 'a2V' as IndexKey }) // no change needed, keep whatever we had before

		// todo: should the arrow go back to where it was before?
	})

	it('Correctly sets index when reparenting with multiple arrows', () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

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
				props: { start: { x: 0, y: 0 }, end: { x: 100, y: 100 } },
			},
			{
				id: arrow2Id,
				type: 'arrow',
				x: 0,
				y: 0,
				props: { start: { x: 0, y: 0 }, end: { x: 100, y: 100 } },
			},
		])

		// bind arrows to boxes:
		editor
			.select(arrow1Id)
			.pointerDown(100, 100, {
				target: 'handle',
				handle: { id: 'end', type: 'vertex', index: 'a0' as IndexKey, x: 100, y: 100 },
				shape: editor.getShape(arrow1Id)!,
			})
			.pointerMove(120, 120)
			.pointerUp()

			.select(arrow2Id)
			.pointerDown(100, 100, {
				target: 'handle',
				handle: { id: 'end', type: 'vertex', index: 'a0' as IndexKey, x: 100, y: 100 },
				shape: editor.getShape(arrow2Id)!,
			})
			.pointerMove(150, 150)

		const arrow1BoundIndex = editor.getShape(arrow1Id)!.index
		const arrow2BoundIndex = editor.getShape(arrow2Id)!.index
		expect(arrow1BoundIndex).toBe('a1V')
		expect(arrow2BoundIndex).toBe('a1G')

		// nudge everything around and make sure we all stay in the right order
		editor.selectAll().nudgeShapes(editor.getSelectedShapeIds(), { x: -1, y: 0 })
		expect(editor.getShape(arrow1Id)!.index).toBe('a1V')
		expect(editor.getShape(arrow2Id)!.index).toBe('a1G')
	})
})

describe('precision timeout configuration', () => {
	it('uses a timeout when dragging arrow handles', () => {
		// Create an arrow first

		editor.setCurrentTool('arrow').pointerDown(0, 0)
		// Use high velocity to avoid precise mode immediately
		editor.inputs.pointerVelocity = new Vec(1, 1)
		editor.pointerMove(100, 100)

		const arrow = editor.getCurrentPageShapes()[
			editor.getCurrentPageShapes().length - 1
		] as TLArrowShape

		editor.expectToBeIn('select.dragging_handle')

		expect(bindings(arrow.id)).toMatchObject({
			end: {
				toId: ids.box1,
				props: {
					isPrecise: false,
				},
			},
		})

		vi.advanceTimersByTime(1000)

		expect(bindings(arrow.id)).toMatchObject({
			end: {
				toId: ids.box1,
				props: {
					isPrecise: true,
				},
			},
		})
	})

	it('allows configuring the pointingPreciseTimeout', () => {
		init({
			shapeUtils: [
				...defaultShapeUtils.map((s) =>
					s.type === 'arrow' ? ArrowShapeUtil.configure({ pointingPreciseTimeout: 2000 }) : s
				),
			],
		})
		// Create an arrow first

		editor.setCurrentTool('arrow').pointerDown(0, 0)
		// Use high velocity to avoid precise mode immediately
		editor.inputs.pointerVelocity = new Vec(1, 1)
		editor.pointerMove(100, 100)

		const arrow = editor.getCurrentPageShapes()[
			editor.getCurrentPageShapes().length - 1
		] as TLArrowShape

		editor.expectToBeIn('select.dragging_handle')

		expect(bindings(arrow.id)).toMatchObject({
			end: {
				toId: ids.box1,
				props: {
					isPrecise: false,
				},
			},
		})

		vi.advanceTimersByTime(1000)

		expect(bindings(arrow.id)).toMatchObject({
			end: {
				toId: ids.box1,
				props: {
					isPrecise: false,
				},
			},
		})

		vi.advanceTimersByTime(1000)

		expect(bindings(arrow.id)).toMatchObject({
			end: {
				toId: ids.box1,
				props: {
					isPrecise: true,
				},
			},
		})
	})
})

describe('line bug', () => {
	it('works as expected when binding to a straight line', () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

		expect(editor.getCurrentPageShapes().length).toBe(0)

		editor
			.setCurrentTool('line')
			.keyDown('Shift')
			.pointerMove(0, 0)
			.pointerDown()
			.pointerMove(0, 100)
			.pointerUp()
			.keyUp('Shift')
			.setCurrentTool('arrow')
			.keyDown('Shift')
			.pointerMove(50, 50)
			.pointerDown()
			.pointerMove(0, 50)
			.pointerUp()
			.keyUp('Shift')

		expect(editor.getCurrentPageShapes().length).toBe(2)
		const bindings = getArrowBindings(editor, editor.getCurrentPageShapes()[1] as TLArrowShape)
		expect(bindings.end).toBeDefined()
	})

	it('works as expected when binding to a straight horizontal line', () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

		expect(editor.getCurrentPageShapes().length).toBe(0)

		editor
			.setCurrentTool('line')
			.pointerMove(0, 0)
			.pointerDown()
			.pointerMove(0, 100)
			.pointerUp()
			.setCurrentTool('arrow')
			.pointerMove(50, 50)
			.pointerDown()
			.pointerMove(0, 50)
			.pointerUp()

		expect(editor.getCurrentPageShapes().length).toBe(2)
		const bindings = getArrowBindings(editor, editor.getCurrentPageShapes()[1] as TLArrowShape)
		expect(bindings.end).toBeDefined()
	})
})
