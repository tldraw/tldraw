import { createCustomShapeId } from '@tldraw/tlschema'
import { TestApp } from '../TestApp'

let app: TestApp

jest.useFakeTimers()

const ids = {
	box1: createCustomShapeId('box1'),
	box2: createCustomShapeId('box2'),
	box3: createCustomShapeId('box3'),
	box4: createCustomShapeId('box4'),
	draw1: createCustomShapeId('draw1'),
	frame1: createCustomShapeId('frame1'),
	group1: createCustomShapeId('group1'),
}

beforeEach(() => {
	app = new TestApp()
	app.createShapes([
		{
			id: ids.box1,
			type: 'geo',
			x: 0,
			y: 0,
			props: {
				fill: 'none',
			},
		},
		{
			id: ids.box2,
			type: 'geo',
			x: 75, // overlapping box1
			y: 75,
			props: {
				fill: 'solid',
			},
		},
		{
			id: ids.box3,
			type: 'geo',
			x: 300,
			y: 300,
			props: {
				fill: 'solid',
			},
		},
		{
			id: ids.frame1,
			type: 'frame',
			x: 300,
			y: 0,
			props: {
				w: 100,
				h: 100,
			},
		},
		{
			id: ids.box4,
			type: 'geo',
			parentId: ids.frame1,
			x: 50,
			y: 50, // clipped by frame
			props: {
				fill: 'solid',
			},
		},
		{
			id: ids.draw1,
			type: 'draw',
			x: 0,
			y: 300,
			props: {
				segments: [
					{
						type: 'free',
						points: [
							{ x: 0, y: 0 },
							{ x: 2, y: 50 },
							{ x: 10, y: 100 },
							{ x: 48, y: 100 },
							{ x: 100, y: 100 },
						],
					},
				],
			},
		},
	])
})

afterEach(() => {
	app?.dispose()
})

describe('When clicking', () => {
	it('Selects the tool, adds the hovered shapes to the app.erasingIds array on pointer down, deletes them on pointer up, restores on undo and deletes again on redo', () => {
		app.setSelectedTool('eraser')

		// Starts in idle
		app.expectPathToBe('root.eraser.idle')

		const shapesBeforeCount = app.shapesArray.length

		app.pointerDown(0, 0) // near enough to box1

		// Enters the pointing state
		app.expectPathToBe('root.eraser.pointing')

		// Sets the erasingIds array / erasingIdsSet
		expect(app.erasingIds).toEqual([ids.box1])
		expect(app.erasingIdsSet).toEqual(new Set([ids.box1]))

		app.pointerUp()

		const shapesAfterCount = app.shapesArray.length

		// Deletes the erasing shapes
		expect(app.getShapeById(ids.box1)).toBeUndefined()
		expect(shapesAfterCount).toBe(shapesBeforeCount - 1)

		// Also empties the erasingIds array / erasingIdsSet
		expect(app.erasingIds).toEqual([])
		expect(app.erasingIdsSet).toEqual(new Set([]))

		// Returns to idle
		app.expectPathToBe('root.eraser.idle')

		app.undo()

		expect(app.getShapeById(ids.box1)).toBeDefined()
		expect(app.shapesArray.length).toBe(shapesBeforeCount)

		app.redo()

		expect(app.getShapeById(ids.box1)).toBeUndefined()
		expect(app.shapesArray.length).toBe(shapesBeforeCount - 1)
	})

	it('Erases all shapes under the cursor on click', () => {
		app.setSelectedTool('eraser')

		const shapesBeforeCount = app.shapesArray.length

		app.pointerDown(99, 99) // neat to box1 AND in box2

		expect(new Set(app.erasingIds)).toEqual(new Set([ids.box1, ids.box2]))
		expect(app.erasingIdsSet).toEqual(new Set([ids.box1, ids.box2]))

		app.pointerUp()

		expect(app.getShapeById(ids.box1)).toBeUndefined()
		expect(app.getShapeById(ids.box2)).toBeUndefined()

		const shapesAfterCount = app.shapesArray.length
		expect(shapesAfterCount).toBe(shapesBeforeCount - 2)
	})

	it("Erases a group when clicking on the group's child", () => {
		app.groupShapes([ids.box2, ids.box3], ids.group1)
		app.setSelectedTool('eraser')

		const shapesBeforeCount = app.shapesArray.length

		app.pointerDown(350, 350) // in box3

		expect(new Set(app.erasingIds)).toEqual(new Set([ids.group1]))
		expect(app.erasingIdsSet).toEqual(new Set([ids.group1]))

		app.pointerUp()

		const shapesAfterCount = app.shapesArray.length

		expect(app.getShapeById(ids.box2)).toBeUndefined()
		expect(app.getShapeById(ids.box3)).toBeUndefined()
		expect(app.getShapeById(ids.group1)).toBeUndefined()

		expect(shapesAfterCount).toBe(shapesBeforeCount - 3)
	})

	it('Does not erase a group when clicking on the group itself', () => {
		app.groupShapes([ids.box2, ids.box3], ids.group1)
		app.setSelectedTool('eraser')

		const shapesBeforeCount = app.shapesArray.length

		app.pointerDown(275, 275) // in between box2 AND box3, so over of the new group
		expect(app.erasingIdsSet).toEqual(new Set([]))

		app.pointerUp()

		const shapesAfterCount = app.shapesArray.length
		expect(shapesAfterCount).toBe(shapesBeforeCount)
	})

	it('Stops erasing when it reaches a frame when the frame was not was the top-most hovered shape', () => {
		app.setSelectedTool('eraser')

		const shapesBeforeCount = app.shapesArray.length

		app.pointerDown(375, 75) // inside of the box4 shape inside of box3
		expect(app.erasingIdsSet).toEqual(new Set([ids.box4]))

		app.pointerUp()

		const shapesAfterCount = app.shapesArray.length
		expect(shapesAfterCount).toBe(shapesBeforeCount - 1)

		// Erases the child but does not erase the frame
		expect(app.getShapeById(ids.box4)).toBeUndefined()
		expect(app.getShapeById(ids.frame1)).toBeDefined()
	})

	it('Erases a frame and its children when the frame was the first clicked shape', () => {
		app.setSelectedTool('eraser')

		const shapesBeforeCount = app.shapesArray.length

		app.pointerDown(325, 25) // directly on frame1, not its children
		expect(app.erasingIdsSet).toEqual(new Set([ids.frame1]))

		app.pointerUp() // without dragging!

		const shapesAfterCount = app.shapesArray.length
		expect(shapesAfterCount).toBe(shapesBeforeCount - 2)

		// Erases BOTH the frame and its child
		expect(app.getShapeById(ids.box4)).toBeUndefined()
		expect(app.getShapeById(ids.frame1)).toBeUndefined()
	})

	it('Only erases masked shapes when pointer is inside the mask', () => {
		app.setSelectedTool('eraser')

		const shapesBeforeCount = app.shapesArray.length

		app.pointerDown(425, 125) // inside of box4's bounds, but outside of its parent's mask
		expect(app.erasingIdsSet).toEqual(new Set([]))

		app.pointerUp() // without dragging!

		const shapesAfterCount = app.shapesArray.length
		expect(shapesAfterCount).toBe(shapesBeforeCount)

		// Erases NEITHER the frame nor its child
		expect(app.getShapeById(ids.box4)).toBeDefined()
		expect(app.getShapeById(ids.frame1)).toBeDefined()
	})

	it('Clears erasing ids and does not erase shapes on cancel', () => {
		app.setSelectedTool('eraser')
		app.expectPathToBe('root.eraser.idle')

		const shapesBeforeCount = app.shapesArray.length

		app.pointerDown(0, 0) // in box1
		app.expectPathToBe('root.eraser.pointing')

		expect(app.erasingIds).toEqual([ids.box1])
		expect(app.erasingIdsSet).toEqual(new Set([ids.box1]))

		app.cancel()

		app.pointerUp()

		const shapesAfterCount = app.shapesArray.length

		app.expectPathToBe('root.eraser.idle')

		// Does NOT erase the shape
		expect(app.erasingIds).toEqual([])
		expect(app.erasingIdsSet).toEqual(new Set([]))
		expect(app.getShapeById(ids.box1)).toBeDefined()
		expect(shapesAfterCount).toBe(shapesBeforeCount)
	})

	it('Clears erasing ids and does not erase shapes on interrupt', () => {
		app.setSelectedTool('eraser')
		app.expectPathToBe('root.eraser.idle')

		const shapesBeforeCount = app.shapesArray.length

		app.pointerDown(0, 0) // near to box1
		app.expectPathToBe('root.eraser.pointing')

		expect(app.erasingIds).toEqual([ids.box1])
		expect(app.erasingIdsSet).toEqual(new Set([ids.box1]))

		app.interrupt()

		app.pointerUp()

		const shapesAfterCount = app.shapesArray.length

		app.expectPathToBe('root.eraser.idle')

		// Does NOT erase the shape
		expect(app.erasingIds).toEqual([])
		expect(app.erasingIdsSet).toEqual(new Set([]))
		expect(app.getShapeById(ids.box1)).toBeDefined()
		expect(shapesAfterCount).toBe(shapesBeforeCount)
	})
})

describe('When clicking and dragging', () => {
	it('Enters erasing state on pointer move, adds contacted shapes to the apps.erasingIds array / apps.erasingIdsSet, deletes them and clears erasingIds / erasingIdsSet on pointer up, restores shapes on undo and deletes again on redo', () => {
		app.setSelectedTool('eraser')

		app.expectPathToBe('root.eraser.idle')

		app.pointerDown(-100, -100) // outside of any shapes

		app.expectPathToBe('root.eraser.pointing')
		expect(app.scribble).toBe(null)

		app.pointerMove(50, 50) // inside of box1

		app.expectPathToBe('root.eraser.erasing')

		jest.advanceTimersByTime(16)
		expect(app.scribble).not.toBe(null)

		expect(app.erasingIds).toEqual([ids.box1])
		expect(app.erasingIdsSet).toEqual(new Set([ids.box1]))

		app.pointerUp()
		app.expectPathToBe('root.eraser.idle')
		expect(app.erasingIds).toEqual([])
		expect(app.erasingIdsSet).toEqual(new Set([]))
		expect(app.getShapeById(ids.box1)).not.toBeDefined()

		app.undo()

		expect(app.erasingIds).toEqual([])
		expect(app.erasingIdsSet).toEqual(new Set([]))
		expect(app.getShapeById(ids.box1)).toBeDefined()

		app.redo()

		expect(app.erasingIds).toEqual([])
		expect(app.erasingIdsSet).toEqual(new Set([]))
		expect(app.getShapeById(ids.box1)).not.toBeDefined()
	})

	it('Clears erasing ids and does not erase shapes on cancel', () => {
		app.setSelectedTool('eraser')
		app.expectPathToBe('root.eraser.idle')
		app.pointerDown(-100, -100) // outside of any shapes
		app.pointerMove(50, 50) // inside of box1
		jest.advanceTimersByTime(16)
		expect(app.scribble).not.toBe(null)
		expect(app.erasingIds).toEqual([ids.box1])
		expect(app.erasingIdsSet).toEqual(new Set([ids.box1]))
		app.cancel()
		app.expectPathToBe('root.eraser.idle')
		expect(app.erasingIds).toEqual([])
		expect(app.erasingIdsSet).toEqual(new Set([]))
		expect(app.getShapeById(ids.box1)).toBeDefined()
	})

	it('Excludes a group if it was hovered when the drag started', () => {
		app.groupShapes([ids.box2, ids.box3], ids.group1)
		app.setSelectedTool('eraser')
		app.expectPathToBe('root.eraser.idle')
		app.pointerDown(275, 275) // in between box2 AND box3, so over of the new group
		app.pointerMove(280, 280) // still outside of the new group
		jest.advanceTimersByTime(16)
		expect(app.scribble).not.toBe(null)
		expect(app.erasingIds).toEqual([])
		expect(app.erasingIdsSet).toEqual(new Set([]))
		app.pointerMove(0, 0)
		expect(app.erasingIds).toEqual([ids.box1])
		expect(app.erasingIdsSet).toEqual(new Set([ids.box1]))
		expect(app.getShapeById(ids.box1)).toBeDefined()
		app.pointerUp()
		expect(app.getShapeById(ids.group1)).toBeDefined()
		expect(app.getShapeById(ids.box1)).not.toBeDefined()
	})

	it('Excludes a frame if it was hovered when the drag started', () => {
		app.setSelectedTool('eraser')
		app.pointerDown(325, 25) // directly on frame1, not its children
		app.pointerMove(350, 375) // still in the frame, passing through box3
		jest.advanceTimersByTime(16)
		expect(app.scribble).not.toBe(null)
		expect(app.erasingIds).toEqual([ids.box3])
		expect(app.erasingIdsSet).toEqual(new Set([ids.box3]))
		app.pointerUp()
		expect(app.getShapeById(ids.frame1)).toBeDefined()
		expect(app.getShapeById(ids.box3)).not.toBeDefined()
	})

	it('Only erases masked shapes when pointer is inside the mask', () => {
		app.setSelectedTool('eraser')
		app.pointerDown(425, 0) // Above the masked part of box3
		expect(app.erasingIds).toEqual([])
		app.pointerMove(425, 500) // Through the masked part of box3
		jest.advanceTimersByTime(16)
		expect(app.scribble).not.toBe(null)
		expect(app.erasingIds).toEqual([])
		expect(app.erasingIdsSet).toEqual(new Set([]))
		app.pointerUp()
		expect(app.getShapeById(ids.box3)).toBeDefined()

		app.pointerDown(375, 0) // Above the not-masked part of box3
		app.pointerMove(375, 500) // Through the masked part of box3
		expect(app.scribble).not.toBe(null)
		expect(app.erasingIds).toEqual([ids.box3])
		expect(app.erasingIdsSet).toEqual(new Set([ids.box3]))
		app.pointerUp()
		expect(app.getShapeById(ids.box3)).not.toBeDefined()
	})

	it('Does nothing on interrupt, allowing for a pinch during the erasing session', () => {
		app.setSelectedTool('eraser')
		app.pointerDown(-100, -100)
		app.pointerMove(50, 50)
		app.interrupt()
		app.expectPathToBe('root.eraser.erasing')
	})

	it('Starts a scribble on pointer down, updates it on pointer move, stops it on exit', () => {
		app.setSelectedTool('eraser')
		app.pointerDown(-100, -100)
		expect(app.scribble).toBe(null)
		app.pointerMove(50, 50)
		jest.advanceTimersByTime(16)
		expect(app.scribble).not.toBe(null)
		app.pointerMove(50, 50)
		app.pointerMove(51, 50)
		app.pointerMove(52, 50)
		app.pointerMove(53, 50)
		app.pointerUp()
		expect(app.scribble).not.toBe(null)
	})
})

// Not yet implemented
describe('When shift clicking', () => {
	it.todo('Erases a line between the previous clicked point and the current point')
	it.todo('Clears the previous clicked point when leaving / re-entering the eraser tool')
})

describe('When in the idle state', () => {
	it('Returns to select on cancel', () => {
		app.setSelectedTool('hand')
		app.expectPathToBe('root.hand.idle')
		app.cancel()
		app.expectPathToBe('root.select.idle')
	})
})
