import { TLArrowShape, Vec2d, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

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

const arrow = () => editor.onlySelectedShape as TLArrowShape

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
		expect(editor.currentPageShapes.length).toBe(1)
	})

	it('cleans up the arrow if the user did not start dragging', () => {
		// with click
		editor.setCurrentTool('arrow')
		editor.pointerMove(0, 0)
		editor.click()
		expect(editor.currentPageShapes.length).toBe(0)
		// with double click
		editor.setCurrentTool('arrow')
		editor.pointerMove(0, 0)
		editor.doubleClick()
		expect(editor.currentPageShapes.length).toBe(0)
		// with pointer up
		editor.setCurrentTool('arrow')
		editor.pointerDown()
		editor.pointerUp()
		expect(editor.currentPageShapes.length).toBe(0)

		// did not add it to the history stack
		editor.undo()
		expect(editor.currentPageShapes.length).toBe(0)
		editor.redo()
		editor.redo()
		expect(editor.currentPageShapes.length).toBe(0)
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
		const arrow1 = editor.currentPageShapes[0]

		expect(arrow()).toMatchObject({
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				start: {
					x: 0,
					y: 0,
					type: 'point',
				},
				end: {
					x: 100,
					y: 0,
					type: 'point',
				},
			},
		})
		expect(editor.getShapeUtil(arrow1).getHandles!(arrow1)).toMatchObject([
			{
				x: 0,
				y: 0,
				type: 'vertex',
				canBind: true,
			},
			{
				x: 50,
				y: 0,
				type: 'virtual',
				canBind: false,
			},
			{
				x: 100,
				y: 0,
				type: 'vertex',
				canBind: true,
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
		expect(arrow().props.start.type).toBe('point')
		expect(arrow().props.end.type).toBe('point')
	})

	it('binds to the shape when dragged into the shape edge', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(100, 50)
		expect(arrow().props.end).toMatchObject({
			type: 'binding',
			boundShapeId: ids.box1,
			normalizedAnchor: { x: 0, y: 0.5 },
		})
	})

	it('does not bind to the shape when dragged past it', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(250, 50)
		expect(arrow().props.end.type).toBe('point')
	})

	it('binds and then unbinds when moved out', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(150, 50)
		expect(arrow().props.end).toMatchObject({
			type: 'binding',
			boundShapeId: ids.box1,
			normalizedAnchor: { x: 0.5, y: 0.5 },
		})
		editor.pointerMove(250, 50)
		expect(arrow().props.end.type).toBe('point')
	})

	it('does not bind when control key is held', () => {
		editor.setCurrentTool('arrow')
		editor.keyDown('Control')
		editor.pointerDown(0, 50)
		editor.pointerMove(100, 50)
		expect(arrow().props.end.type).toBe('point')
	})

	it('does not bind when the shape is locked', () => {
		editor.toggleLock(editor.currentPageShapes)
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(100, 50)
		expect(arrow().props.end.type).toBe('point')
	})

	it('should use timer on keyup when using control key to skip binding', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(100, 50)

		// can press control while dragging to switch into no-binding mode
		expect(arrow().props.end.type).toBe('binding')
		editor.keyDown('Control')
		expect(arrow().props.end.type).toBe('point')

		editor.keyUp('Control')
		expect(arrow().props.end.type).toBe('point') // there's a short delay here, it should still be a point
		jest.advanceTimersByTime(1000) // once the timer runs out...
		expect(arrow().props.end.type).toBe('binding')

		editor.keyDown('Control') // no delay when pressing control again though
		expect(arrow().props.end.type).toBe('point')

		editor.keyUp('Control')
		editor.pointerUp()
		jest.advanceTimersByTime(1000) // once the timer runs out...
		expect(arrow().props.end.type).toBe('point') // still a point because interaction ended before timer ended
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
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box1 })
		editor.pointerMove(175, 50) // box2 is higher
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box2 })
		editor.pointerMove(225, 50) // box3 is higher
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box3 })
		editor.pointerMove(275, 50) // box4 is higher
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box4 })
	})

	it('does not bind when shapes are locked', () => {
		editor.toggleLock([ids.box1, ids.box2, ids.box4])
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(125, 50) // over box1 only
		expect(arrow().props.end).toMatchObject({ type: 'point' }) // box 1 is locked!
		editor.pointerMove(175, 50) // box2 is higher
		expect(arrow().props.end).toMatchObject({ type: 'point' }) // box 2 is locked! box1 is locked!
		editor.pointerMove(225, 50) // box3 is higher
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box3 })
		editor.pointerMove(275, 50) // box4 is higher
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box3 }) // box 4 is locked!
	})

	it('binds to the highest shape or to the first filled shape', () => {
		editor.updateShapes([
			{ id: ids.box1, type: 'geo', props: { fill: 'solid' } },
			{ id: ids.box3, type: 'geo', props: { fill: 'solid' } },
		])
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50) // over nothing
		editor.pointerMove(125, 50) // over box1 only
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box1 })
		editor.pointerMove(175, 50) // box2 is higher but box1 is filled?
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box1 })
		editor.pointerMove(225, 50) // box3 is higher
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box3 })
		editor.pointerMove(275, 50) // box4 is higher but box 3 is filled
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box3 })
	})

	it('binds to the smallest shape regardless of order', () => {
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 0, props: { w: 99, h: 99 } },
			{ id: ids.box2, type: 'geo', x: 150, y: 50, props: { w: 100, h: 100 } },
			{ id: ids.box3, type: 'geo', x: 50, y: 80, props: { w: 200, h: 20 } },
		])
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 50)
		editor.pointerMove(175, 50) // box1 is smaller even though it's behind box2
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box1 })
		editor.pointerMove(150, 90) // box3 is smaller and at the front
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box3 })
		editor.sendToBack([ids.box3])
		editor.pointerMove(149, 90) // box3 is smaller, even when at the back
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box3 })
		editor.pointerMove(175, 50)
		expect(arrow().props.end).toMatchObject({ boundShapeId: ids.box1 })
	})
})

describe('When starting an arrow inside of multiple shapes', () => {
	beforeEach(() => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
	})

	it('does not create the arrow immediately', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(50, 50)
		expect(editor.currentPageShapes.length).toBe(1)
		expect(arrow()).toBe(null)
	})

	it('does not create a shape if pointer up before drag', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(50, 50)
		expect(editor.currentPageShapes.length).toBe(1)
		editor.pointerUp(50, 50)
		expect(editor.currentPageShapes.length).toBe(1)
	})

	it('creates the arrow after a drag, bound to the shape', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(50, 50)
		expect(editor.currentPageShapes.length).toBe(1)
		expect(arrow()).toBe(null)
		editor.pointerMove(55, 50)
		expect(editor.currentPageShapes.length).toBe(2)
		expect(arrow()).toMatchObject({
			x: 50,
			y: 50,
			props: {
				start: {
					type: 'binding',
					boundShapeId: ids.box1,
					normalizedAnchor: {
						x: 0.5,
						y: 0.5,
					},
				},
				end: {
					type: 'binding',
					boundShapeId: ids.box1,
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
		expect(editor.currentPageShapes.length).toBe(1)
		expect(arrow()).toBe(null)
		editor.pointerMove(25, 20)
		expect(editor.currentPageShapes.length).toBe(2)
		expect(arrow()).toMatchObject({
			x: 20,
			y: 20,
			props: {
				start: {
					type: 'binding',
					boundShapeId: ids.box1,
					normalizedAnchor: {
						// bound to the center, imprecise!
						x: 0.5,
						y: 0.5,
					},
				},
				end: {
					type: 'binding',
					boundShapeId: ids.box1,
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
		expect(editor.currentPageShapes.length).toBe(1)
		expect(arrow()).toBe(null)
		jest.advanceTimersByTime(1000)
		editor.pointerMove(25, 20)
		expect(editor.currentPageShapes.length).toBe(2)
		expect(arrow()).toMatchObject({
			x: 20,
			y: 20,
			props: {
				start: {
					type: 'binding',
					boundShapeId: ids.box1,
					normalizedAnchor: {
						// precise!
						x: 0.2,
						y: 0.2,
					},
				},
				end: {
					type: 'binding',
					boundShapeId: ids.box1,
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
		expect(editor.currentPageShapes.length).toBe(2)
		expect(arrow()).toBe(null)
		editor.pointerMove(30, 30)
		expect(editor.currentPageShapes.length).toBe(3)
		expect(arrow()).toMatchObject({
			x: 25,
			y: 25,
			props: {
				start: {
					type: 'binding',
					boundShapeId: ids.box2,
					normalizedAnchor: {
						x: 0.5,
						y: 0.5,
					},
				},
				end: {
					type: 'binding',
					boundShapeId: ids.box2,
					normalizedAnchor: {
						x: 0.6,
						y: 0.6,
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
		expect(editor.currentPageShapes.length).toBe(2)
		expect(arrow()).toBe(null)
		editor.pointerMove(30, 30)
		expect(editor.currentPageShapes.length).toBe(3)
		expect(arrow()).toMatchObject({
			x: 25,
			y: 25,
			props: {
				start: {
					type: 'binding',
					boundShapeId: ids.box2,
					normalizedAnchor: {
						x: 0.5,
						y: 0.5,
					},
				},
				end: {
					type: 'binding',
					boundShapeId: ids.box2,
					normalizedAnchor: {
						x: 0.6,
						y: 0.6,
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
		expect(editor.currentPageShapes.length).toBe(2)
		expect(arrow()).toBe(null)
		editor.pointerMove(30, 30)
		expect(editor.currentPageShapes.length).toBe(3)
		expect(arrow()).toMatchObject({
			props: {
				start: {
					boundShapeId: ids.box1, // not box 2!
				},
				end: {
					boundShapeId: ids.box1, // not box 2
				},
			},
		})
	})

	it('starts a filled shape if it is above the hollow shape', () => {
		// box2 - small, hollow
		// box1 - big, filled
		editor.updateShape({ id: ids.box1, type: 'geo', props: { fill: 'solid' } })
		editor.bringToFront([ids.box1])

		expect(
			editor.getShapeAtPoint(new Vec2d(25, 25), {
				filter: (shape) => editor.getShapeUtil(shape).canBind(shape),
				hitInside: true,
				hitFrameInside: true,
				margin: 0,
			})?.id
		).toBe(ids.box1)

		editor.setCurrentTool('arrow')
		editor.pointerDown(25, 25)
		expect(editor.currentPageShapes.length).toBe(2)
		expect(arrow()).toBe(null)
		editor.pointerMove(30, 30)
		expect(editor.currentPageShapes.length).toBe(3)
		expect(arrow()).toMatchObject({
			x: 25,
			y: 25,
			props: {
				start: {
					type: 'binding',
					boundShapeId: ids.box1,
					normalizedAnchor: {
						x: 0.5,
						y: 0.5,
					},
				},
				end: {
					type: 'binding',
					boundShapeId: ids.box1,
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
		expect(editor.currentPageShapes.length).toBe(2)
		expect(arrow()).toBe(null)
		editor.pointerMove(30, 30)
		expect(editor.currentPageShapes.length).toBe(3)
		expect(arrow()).toMatchObject({
			x: 25,
			y: 25,
			props: {
				start: {
					type: 'binding',
					boundShapeId: ids.box2,
					normalizedAnchor: {
						x: 0.5,
						y: 0.5,
					},
				},
				end: {
					type: 'binding',
					boundShapeId: ids.box2,
					normalizedAnchor: {
						x: 0.6,
						y: 0.6,
					},
				},
			},
		})
	})
})

it.todo(
	'after creating an arrow while tool lock is enabled, pressing enter will begin editing that shape'
)
