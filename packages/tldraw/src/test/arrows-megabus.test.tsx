import { TLArrowShape, TLShapeId, Vec, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { getArrowBindings } from '../lib/shapes/arrow/shared'
import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	box5: createShapeId('box5'),
	frame1: createShapeId('frame1'),
	group1: createShapeId('group1'),
	group2: createShapeId('group2'),
	group3: createShapeId('group3'),
	arrow1: createShapeId('arrow1'),
	arrow2: createShapeId('arrow2'),
	arrow3: createShapeId('arrow3'),
}

const arrow = () => editor.getOnlySelectedShape() as TLArrowShape
const bindings = () => getArrowBindings(editor, arrow())

beforeEach(() => {
	editor = new TestEditor()
})

it('requires a move to begin drawing', () => {
	editor.pointerMove(0, 0)
	editor.pointerDown()
	editor.pointerMove(2, 0)

	expect(editor.inputs.isDragging).toBe(false)
})

describe('Making an arrow on the page', () => {
	it('creates an arrow on pointer down ', () => {
		editor.setCurrentTool('arrow')
		editor.pointerMove(0, 0)
		editor.pointerDown()
		expect(editor.getCurrentPageShapes().length).toBe(1)
	})

	it('cleans up the arrow if the user did not start dragging', () => {
		// with click
		editor.setCurrentTool('arrow')
		editor.pointerMove(0, 0)
		editor.click()
		expect(editor.getCurrentPageShapes().length).toBe(0)
		// with double click
		editor.setCurrentTool('arrow')
		editor.pointerMove(0, 0)
		editor.doubleClick()
		expect(editor.getCurrentPageShapes().length).toBe(0)
		// with pointer up
		editor.setCurrentTool('arrow')
		editor.pointerDown()
		editor.pointerUp()
		expect(editor.getCurrentPageShapes().length).toBe(0)

		// did not add it to the history stack
		editor.undo()
		expect(editor.getCurrentPageShapes().length).toBe(0)
		editor.redo()
		editor.redo()
		expect(editor.getCurrentPageShapes().length).toBe(0)
	})

	it('keeps the arrow if the user dragged', () => {
		editor.setCurrentTool('arrow')
		editor.pointerMove(0, 0)
		editor.pointerDown()
		editor.pointerMove(100, 0)
	})

	it('creates the arrow with the expected properties', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 0)
		editor.pointerMove(100, 0)
		const arrow1 = editor.getCurrentPageShapes()[0]

		expect(arrow()).toMatchObject({
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: { x: 0, y: 0 },
				end: { x: 100, y: 0 },
			},
		})
		expect(editor.getShapeUtil(arrow1).getHandles!(arrow1)).toMatchObject([
			{
				x: 0,
				y: 0,
				type: 'vertex',
			},
			{
				x: 100,
				y: 0,
				type: 'vertex',
			},
			{
				x: 50,
				y: 0,
				type: 'virtual',
			},
		])
	})
})

describe('When binding an arrow to a shape', () => {
	beforeEach(() => {
		editor.createShape({ id: ids.box1, type: 'geo', x: 100, y: 0, props: { w: 100, h: 100 } })
	})

	it('does not bind to the shape when dragged into margin', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(99, 50)
		expect(bindings().start).toBeUndefined()
		expect(bindings().end).toBeUndefined()
	})

	it('binds to the shape when dragged into the shape edge', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(100, 50)
		expect(bindings().end).toMatchObject({
			toId: ids.box1,
			props: { normalizedAnchor: { x: 0, y: 0.5 } },
		})
	})

	it('does not bind to the shape when dragged past it', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(250, 50)
		expect(bindings().end).toBeUndefined()
	})

	it('binds and then unbinds when moved out', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(150, 50)
		expect(bindings().end).toMatchObject({
			toId: ids.box1,
			props: {
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isPrecise: true, // enclosed
			},
		})
		editor.pointerMove(250, 50)
		expect(bindings().end).toBeUndefined()
	})

	it('does not bind when control key is held', () => {
		editor.setCurrentTool('arrow')
		editor.keyDown('Control')
		editor.pointerDown(0, 50)
		editor.pointerMove(100, 50)
		expect(bindings().end).toBeUndefined()
	})

	it('creates exact bindings when alt key is held', () => {
		editor.setCurrentTool('arrow')
		editor.keyDown('Alt')
		editor.pointerDown(0, 50)
		editor.pointerMove(100, 50)
		expect(bindings().end).toMatchObject({
			toId: ids.box1,
			props: {
				isExact: true,
			},
		})
	})

	it('creates non-exact bindings when alt key is not held', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(100, 50)
		expect(bindings().end).toMatchObject({
			toId: ids.box1,
			props: {
				isExact: false,
			},
		})
	})

	it('does not bind when the shape is locked', () => {
		editor.toggleLock(editor.getCurrentPageShapes())
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(100, 50)
		expect(bindings().end).toBeUndefined()
	})

	it('should use timer on keyup when using control key to skip binding', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(100, 50)

		// can press control while dragging to switch into no-binding mode
		expect(bindings().end).toBeDefined()
		editor.keyDown('Control')
		expect(bindings().end).toBeUndefined()

		editor.keyUp('Control')
		expect(bindings().end).toBeUndefined() // there's a short delay here, it should still be a point
		vi.advanceTimersByTime(1000) // once the timer runs out...
		expect(bindings().end).toBeDefined()

		editor.keyDown('Control') // no delay when pressing control again though
		expect(bindings().end).toBeUndefined()

		editor.keyUp('Control')
		editor.pointerUp()
		vi.advanceTimersByTime(1000) // once the timer runs out...
		expect(bindings().end).toBeUndefined() // still a point because interaction ended before timer ended
	})

	it('respects shouldIgnoreTargets option when control key is held', () => {
		// This test verifies that the ctrl key behavior is now driven by the shouldIgnoreTargets option
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(100, 50)

		// Initial binding should exist
		expect(bindings().end).toBeDefined()
		expect(bindings().end?.toId).toBe(ids.box1)

		// Pressing ctrl should trigger shouldIgnoreTargets and remove binding
		editor.keyDown('Control')
		expect(bindings().end).toBeUndefined()

		// Releasing ctrl should restore binding (after timer)
		editor.keyUp('Control')
		expect(bindings().end).toBeUndefined() // Still no binding immediately
		vi.advanceTimersByTime(1000)
		expect(bindings().end).toBeDefined()
	})
})

describe('When shapes are overlapping', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 150, y: 50, props: { w: 100, h: 100 } },
			{ id: ids.box3, type: 'geo', x: 200, y: 50, props: { w: 100, h: 100 } },
			{ id: ids.box4, type: 'geo', x: 250, y: 50, props: { w: 100, h: 100 } },
		])
	})

	it('binds to the highest shape or to the first filled shape', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(125, 50) // over box1 only
		expect(bindings().end).toMatchObject({ toId: ids.box1 })
		editor.pointerMove(175, 50) // box2 is higher
		expect(bindings().end).toMatchObject({ toId: ids.box2 })
		editor.pointerMove(225, 50) // box3 is higher
		expect(bindings().end).toMatchObject({ toId: ids.box3 })
		editor.pointerMove(275, 50) // box4 is higher
		expect(bindings().end).toMatchObject({ toId: ids.box4 })
	})

	it('does not bind when shapes are locked', () => {
		editor.toggleLock([ids.box1, ids.box2, ids.box4])
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(125, 50) // over box1 only
		expect(bindings().end).toBeUndefined() // box 1 is locked!
		editor.pointerMove(175, 50) // box2 is higher
		expect(bindings().end).toBeUndefined() // box 2 is locked! box1 is locked!
		editor.pointerMove(225, 50) // box3 is higher
		expect(bindings().end).toMatchObject({ toId: ids.box3 })
		editor.pointerMove(275, 50) // box4 is higher
		expect(bindings().end).toMatchObject({ toId: ids.box3 }) // box 4 is locked!
	})

	it('binds to the highest shape or to the first filled shape', () => {
		editor.updateShapes([
			{ id: ids.box1, type: 'geo', props: { fill: 'solid' } },
			{ id: ids.box3, type: 'geo', props: { fill: 'solid' } },
		])
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50) // over nothing
		editor.pointerMove(125, 50) // over box1 only
		expect(bindings().end).toMatchObject({ toId: ids.box1 })
		editor.pointerMove(175, 50) // box2 is higher but box1 is filled, but we're on the edge ofd box 2
		expect(bindings().end).toMatchObject({ toId: ids.box2 })
		editor.pointerMove(175, 70) // box2 is higher but box1 is filled, and we're inside of box2
		expect(bindings().end).toMatchObject({ toId: ids.box1 })
		editor.pointerMove(225, 70) // box3 is higher
		expect(bindings().end).toMatchObject({ toId: ids.box3 })
		editor.pointerMove(275, 70) // box4 is higher but box 3 is filled
		expect(bindings().end).toMatchObject({ toId: ids.box3 })
	})

	it('binds to the smallest shape regardless of order', () => {
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 0, props: { w: 99, h: 99 } },
			{ id: ids.box2, type: 'geo', x: 150, y: 50, props: { w: 100, h: 100 } },
			{ id: ids.box3, type: 'geo', x: 50, y: 80, props: { w: 200, h: 20 } },
		])
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(175, 50) // box1 is smaller even though it's behind box2, but we're on the edge of box 2
		expect(bindings().end).toMatchObject({ toId: ids.box2 })
		editor.pointerMove(175, 70) // box1 is smaller even though it's behind box2
		expect(bindings().end).toMatchObject({ toId: ids.box1 })
		editor.pointerMove(150, 90) // box3 is smaller and at the front but we're on the edge of box 2
		expect(bindings().end).toMatchObject({ toId: ids.box2 })
		editor.pointerMove(160, 90) // box3 is smaller and at the front and we're in box1 and box 3 and box 2
		expect(bindings().end).toMatchObject({ toId: ids.box3 })
		editor.sendToBack([ids.box3])
		editor.pointerMove(149, 90) // box3 is smaller, even when at the back
		expect(bindings().end).toMatchObject({ toId: ids.box3 })
		editor.pointerMove(175, 60) // inside of box1 and box 2, but box 1 is smaller
		expect(bindings().end).toMatchObject({ toId: ids.box1 })
	})
})

describe('When starting an arrow inside of multiple shapes', () => {
	beforeEach(() => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
	})

	it('does not create the arrow immediately', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(50, 50)
		expect(editor.getCurrentPageShapes().length).toBe(1)
		expect(arrow()).toBe(null)
	})

	it('does not create a shape if pointer up before drag', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(50, 50)
		expect(editor.getCurrentPageShapes().length).toBe(1)
		editor.pointerUp(50, 50)
		expect(editor.getCurrentPageShapes().length).toBe(1)
	})

	it('creates the arrow after a drag, bound to the shape', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(50, 50)
		expect(editor.getCurrentPageShapes().length).toBe(1)
		expect(arrow()).toBe(null)
		editor.pointerMove(55, 50)
		expect(editor.getCurrentPageShapes().length).toBe(2)
		expect(arrow()).toMatchObject({ x: 50, y: 50 })
		expect(bindings()).toMatchObject({
			start: {
				toId: ids.box1,
				props: {
					normalizedAnchor: {
						x: 0.5,
						y: 0.5,
					},
				},
			},
			end: {
				toId: ids.box1,
				props: {
					normalizedAnchor: {
						x: 0.55,
						y: 0.5,
					},
				},
			},
		})
	})

	it('always creates the arrow with an imprecise start point', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(20, 20) // upper left
		expect(editor.getCurrentPageShapes().length).toBe(1)
		expect(arrow()).toBe(null)
		editor.pointerMove(25, 20)
		expect(editor.getCurrentPageShapes().length).toBe(2)
		expect(arrow()).toMatchObject({ x: 20, y: 20 })
		expect(bindings()).toMatchObject({
			start: {
				toId: ids.box1,
				props: {
					normalizedAnchor: {
						// bound to the center, imprecise!
						x: 0.5,
						y: 0.5,
					},
					isPrecise: false,
				},
			},
			end: {
				toId: ids.box1,
				props: {
					normalizedAnchor: {
						x: 0.25,
						y: 0.2,
					},
				},
			},
		})
	})

	it('after a pause before drag, creates an arrow with a precise start point', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(20, 20) // upper left
		expect(editor.getCurrentPageShapes().length).toBe(1)
		expect(arrow()).toBe(null)
		vi.advanceTimersByTime(1000)
		editor.pointerMove(25, 20)
		expect(editor.getCurrentPageShapes().length).toBe(2)
		expect(arrow()).toMatchObject({ x: 20, y: 20 })
		expect(bindings()).toMatchObject({
			start: {
				toId: ids.box1,
				props: {
					normalizedAnchor: {
						// precise!
						x: 0.2,
						y: 0.2,
					},
				},
			},
			end: {
				toId: ids.box1,
				props: {
					normalizedAnchor: {
						x: 0.25,
						y: 0.2,
					},
				},
			},
		})
	})
})

describe('When starting an arrow inside of multiple shapes', () => {
	beforeEach(() => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
		editor.createShapes([{ id: ids.box2, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } }])
	})

	it('starts the shape inside of the smallest hollow shape when hovering only hollow shapes', () => {
		editor.sendToBack([ids.box2])
		// box1 is bigger and is below box2

		editor.setCurrentTool('arrow')
		editor.pointerDown(25, 25)
		expect(editor.getCurrentPageShapes().length).toBe(2)
		expect(arrow()).toBe(null)
		editor.pointerMove(30, 30)
		expect(editor.getCurrentPageShapes().length).toBe(3)
		expect(arrow()).toMatchObject({ x: 25, y: 25 })
		expect(bindings()).toMatchObject({
			start: {
				toId: ids.box2,
				props: {
					normalizedAnchor: {
						x: 0.5,
						y: 0.5,
					},
				},
			},
			end: {
				toId: ids.box2,
				props: {
					normalizedAnchor: {
						x: 0.55,
						y: 0.5,
					},
				},
			},
		})
	})

	it('starts the shape inside of the smallest hollow shape regardless of which is above when hovering only hollow shapes', () => {
		editor.sendToBack([ids.box2])
		// box1 is bigger and is above box2

		editor.setCurrentTool('arrow')
		editor.pointerDown(25, 25)
		expect(editor.getCurrentPageShapes().length).toBe(2)
		expect(arrow()).toBe(null)
		editor.pointerMove(30, 30)
		expect(editor.getCurrentPageShapes().length).toBe(3)
		expect(arrow()).toMatchObject({ x: 25, y: 25 })
		expect(bindings()).toMatchObject({
			start: {
				toId: ids.box2,
				props: {
					normalizedAnchor: {
						x: 0.5,
						y: 0.5,
					},
				},
			},
			end: {
				toId: ids.box2,
				props: {
					normalizedAnchor: {
						x: 0.55,
						y: 0.5,
					},
				},
			},
		})
	})

	it('skips locked shape when starting an arrow over shapes', () => {
		editor.toggleLock([ids.box2])
		editor.sendToBack([ids.box2])
		// box1 is bigger and is above box2

		editor.setCurrentTool('arrow')
		editor.pointerDown(25, 25)
		expect(editor.getCurrentPageShapes().length).toBe(2)
		expect(arrow()).toBe(null)
		editor.pointerMove(30, 30)
		expect(editor.getCurrentPageShapes().length).toBe(3)
		expect(bindings()).toMatchObject({
			start: {
				toId: ids.box1, // not box 2!
			},
			end: {
				toId: ids.box1, // not box 2
			},
		})
	})

	it('starts a filled shape if it is above the hollow shape', () => {
		// box2 - small, hollow
		// box1 - big, filled
		editor.updateShape({ id: ids.box1, type: 'geo', props: { fill: 'solid' } })
		editor.bringToFront([ids.box1])

		expect(
			editor.getShapeAtPoint(new Vec(25, 25), {
				filter: (shape) =>
					editor.canBindShapes({ fromShape: 'arrow', toShape: shape, binding: 'arrow' }),
				hitInside: true,
				hitFrameInside: true,
				margin: 0,
			})?.id
		).toBe(ids.box1)

		editor.setCurrentTool('arrow')
		editor.pointerDown(25, 25)
		expect(editor.getCurrentPageShapes().length).toBe(2)
		expect(arrow()).toBe(null)
		editor.pointerMove(30, 30)
		expect(editor.getCurrentPageShapes().length).toBe(3)
		expect(arrow()).toMatchObject({ x: 25, y: 25 })
		expect(bindings()).toMatchObject({
			start: {
				toId: ids.box1,
				props: {
					normalizedAnchor: {
						x: 0.5,
						y: 0.5,
					},
					isPrecise: false,
				},
			},
			end: {
				toId: ids.box1,
				props: {
					normalizedAnchor: {
						x: 0.3,
						y: 0.3,
					},
				},
			},
		})
	})

	it('starts a small hollow shape if it is above the bigger filled shape', () => {
		// box1 - big, hollow
		// box2 - small, filled
		editor.updateShape({ id: ids.box2, type: 'geo', props: { fill: 'solid' } })
		editor.bringToFront([ids.box2])

		editor.setCurrentTool('arrow')
		editor.pointerDown(25, 25)
		expect(editor.getCurrentPageShapes().length).toBe(2)
		expect(arrow()).toBe(null)
		editor.pointerMove(30, 30)
		expect(editor.getCurrentPageShapes().length).toBe(3)
		expect(arrow()).toMatchObject({ x: 25, y: 25 })
		expect(bindings()).toMatchObject({
			start: {
				toId: ids.box2,
				props: {
					normalizedAnchor: {
						x: 0.5,
						y: 0.5,
					},
				},
			},
			end: {
				toId: ids.box2,
				props: {
					normalizedAnchor: {
						x: 0.55,
						y: 0.5,
					},
				},
			},
		})
	})
})

it.todo(
	'after creating an arrow while tool lock is enabled, pressing enter will begin editing that shape'
)

describe('When binding an arrow to an ancestor', () => {
	it('binds precisely from child to parent', () => {
		const ids = {
			frame: createShapeId(),
			box1: createShapeId(),
		}

		editor.createShapes([
			{
				id: ids.frame,
				type: 'frame',
			},
			{
				id: ids.box1,
				type: 'geo',
				parentId: ids.frame,
			},
		])

		editor.setCurrentTool('arrow')
		editor.pointerMove(25, 25)
		editor.pointerDown()
		editor.pointerMove(150, 50)
		editor.pointerUp()

		const arrow = editor.getCurrentPageShapes().find((s) => s.type === 'arrow') as TLArrowShape
		if (!arrow) throw Error('No arrow')
		const bindings = getArrowBindings(editor, arrow)
		if (!bindings.start) throw Error('no binding')
		if (!bindings.end) throw Error('no binding')

		expect(bindings.start.toId).toBe(ids.box1)
		expect(bindings.end.toId).toBe(ids.frame)
		expect(bindings.start.props.isPrecise).toBe(false)
		expect(bindings.end.props.isPrecise).toBe(true)
	})

	it('binds precisely from parent to child', () => {
		const ids = {
			frame: createShapeId(),
			box1: createShapeId(),
		}

		editor.createShapes([
			{
				id: ids.frame,
				type: 'frame',
			},
			{
				id: ids.box1,
				type: 'geo',
				parentId: ids.frame,
			},
		])

		editor.setCurrentTool('arrow')
		editor.pointerMove(150, 50)
		editor.pointerDown()
		editor.pointerMove(25, 25)
		editor.pointerUp()

		const arrow = editor.getCurrentPageShapes().find((s) => s.type === 'arrow') as TLArrowShape
		if (!arrow) throw Error('No arrow')
		const bindings = getArrowBindings(editor, arrow)
		if (!bindings.start) throw Error('no binding')
		if (!bindings.end) throw Error('no binding')

		expect(bindings.start.toId).toBe(ids.frame)
		expect(bindings.end.toId).toBe(ids.box1)
		expect(bindings.start.props.isPrecise).toBe(false)
		expect(bindings.end.props.isPrecise).toBe(true)
	})
})

describe('Moving a bound arrow', () => {
	function setup() {
		editor.createShapesFromJsx([
			<TL.geo id={ids.box1} x={0} y={0} w={200} h={200} />,
			<TL.geo id={ids.box2} x={300} y={0} w={200} h={200} />,
		])
	}

	function expectBound(handle: 'start' | 'end', boundShapeId: TLShapeId) {
		expect(bindings()[handle]).toMatchObject({
			toId: boundShapeId,
		})
	}

	function expectUnbound(handle: 'start' | 'end') {
		expect(bindings()[handle]).toBeUndefined()
	}

	it('keeps the start of the arrow bound to the original shape as it moves', () => {
		setup()

		// draw an arrow pointing down from box1
		editor.setCurrentTool('arrow').pointerDown(100, 100).pointerMove(100, 300).pointerUp(100, 300)
		expectBound('start', ids.box1)
		expectUnbound('end')

		// start translating it:
		editor.setCurrentTool('select').pointerDown(100, 200)

		// arrow should stay bound to box1 as long as its end is within it:
		editor.pointerMove(150, 200)
		expectBound('start', ids.box1)
		expectUnbound('end')

		// arrow becomes unbound when its end is outside of box1:
		editor.pointerMove(250, 200)
		expectUnbound('start')
		expectUnbound('end')

		// arrow remains unbound when its end is inside of box2:
		editor.pointerMove(350, 200)
		expectUnbound('start')
		expectUnbound('end')

		// arrow becomes re-bound to box1 when it goes back inside box1:
		editor.pointerMove(100, 200)
		expectBound('start', ids.box1)
		expectUnbound('end')
	})

	it('keeps the end of the arrow bound to the original shape as it moves', () => {
		setup()

		// draw an arrow pointing from box1 to box2
		editor.setCurrentTool('arrow').pointerDown(100, 100).pointerMove(400, 200).pointerUp(400, 200)
		expectBound('start', ids.box1)
		expectBound('end', ids.box2)

		// start translating it:
		const center = editor.getShapePageBounds(editor.getOnlySelectedShape()!)!.center
		editor.setCurrentTool('select').pointerDown(center.x, center.y)

		// arrow should stay bound to box2 as long as its end is within it:
		editor.pointerMove(center.x + 50, center.y)
		expectBound('start', ids.box1)
		expectBound('end', ids.box2)

		// arrow becomes unbound when its end is outside of box2:
		editor.pointerMove(center.x + 200, 200)
		expectUnbound('start')
		expectUnbound('end')

		// arrow becomes re-bound to box2 when it goes back inside box2:
		editor.pointerMove(center.x + 50, center.y)
		expectBound('start', ids.box1)
		expectBound('end', ids.box2)
	})
})
