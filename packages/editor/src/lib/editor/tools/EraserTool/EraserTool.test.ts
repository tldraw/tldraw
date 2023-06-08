import { createShapeId } from '@tldraw/tlschema'
import { TestEditor } from '../../../test/TestEditor'

let editor: TestEditor

jest.useFakeTimers()

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	draw1: createShapeId('draw1'),
	frame1: createShapeId('frame1'),
	group1: createShapeId('group1'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
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
	editor?.dispose()
})

describe('When clicking', () => {
	it('Selects the tool, adds the hovered shapes to the editor.erasingIds array on pointer down, deletes them on pointer up, restores on undo and deletes again on redo', () => {
		editor.setSelectedTool('eraser')

		// Starts in idle
		editor.expectPathToBe('root.eraser.idle')

		const shapesBeforeCount = editor.shapesArray.length

		editor.pointerDown(0, 0) // near enough to box1

		// Enters the pointing state
		editor.expectPathToBe('root.eraser.pointing')

		// Sets the erasingIds array / erasingIdsSet
		expect(editor.erasingIds).toEqual([ids.box1])
		expect(editor.erasingIdsSet).toEqual(new Set([ids.box1]))

		editor.pointerUp()

		const shapesAfterCount = editor.shapesArray.length

		// Deletes the erasing shapes
		expect(editor.getShapeById(ids.box1)).toBeUndefined()
		expect(shapesAfterCount).toBe(shapesBeforeCount - 1)

		// Also empties the erasingIds array / erasingIdsSet
		expect(editor.erasingIds).toEqual([])
		expect(editor.erasingIdsSet).toEqual(new Set([]))

		// Returns to idle
		editor.expectPathToBe('root.eraser.idle')

		editor.undo()

		expect(editor.getShapeById(ids.box1)).toBeDefined()
		expect(editor.shapesArray.length).toBe(shapesBeforeCount)

		editor.redo()

		expect(editor.getShapeById(ids.box1)).toBeUndefined()
		expect(editor.shapesArray.length).toBe(shapesBeforeCount - 1)
	})

	it('Erases all shapes under the cursor on click', () => {
		editor.setSelectedTool('eraser')

		const shapesBeforeCount = editor.shapesArray.length

		editor.pointerDown(99, 99) // neat to box1 AND in box2

		expect(new Set(editor.erasingIds)).toEqual(new Set([ids.box1, ids.box2]))
		expect(editor.erasingIdsSet).toEqual(new Set([ids.box1, ids.box2]))

		editor.pointerUp()

		expect(editor.getShapeById(ids.box1)).toBeUndefined()
		expect(editor.getShapeById(ids.box2)).toBeUndefined()

		const shapesAfterCount = editor.shapesArray.length
		expect(shapesAfterCount).toBe(shapesBeforeCount - 2)
	})

	it("Erases a group when clicking on the group's child", () => {
		editor.groupShapes([ids.box2, ids.box3], ids.group1)
		editor.setSelectedTool('eraser')

		const shapesBeforeCount = editor.shapesArray.length

		editor.pointerDown(350, 350) // in box3

		expect(new Set(editor.erasingIds)).toEqual(new Set([ids.group1]))
		expect(editor.erasingIdsSet).toEqual(new Set([ids.group1]))

		editor.pointerUp()

		const shapesAfterCount = editor.shapesArray.length

		expect(editor.getShapeById(ids.box2)).toBeUndefined()
		expect(editor.getShapeById(ids.box3)).toBeUndefined()
		expect(editor.getShapeById(ids.group1)).toBeUndefined()

		expect(shapesAfterCount).toBe(shapesBeforeCount - 3)
	})

	it('Does not erase a group when clicking on the group itself', () => {
		editor.groupShapes([ids.box2, ids.box3], ids.group1)
		editor.setSelectedTool('eraser')

		const shapesBeforeCount = editor.shapesArray.length

		editor.pointerDown(275, 275) // in between box2 AND box3, so over of the new group
		expect(editor.erasingIdsSet).toEqual(new Set([]))

		editor.pointerUp()

		const shapesAfterCount = editor.shapesArray.length
		expect(shapesAfterCount).toBe(shapesBeforeCount)
	})

	it('Stops erasing when it reaches a frame when the frame was not was the top-most hovered shape', () => {
		editor.setSelectedTool('eraser')

		const shapesBeforeCount = editor.shapesArray.length

		editor.pointerDown(375, 75) // inside of the box4 shape inside of box3
		expect(editor.erasingIdsSet).toEqual(new Set([ids.box4]))

		editor.pointerUp()

		const shapesAfterCount = editor.shapesArray.length
		expect(shapesAfterCount).toBe(shapesBeforeCount - 1)

		// Erases the child but does not erase the frame
		expect(editor.getShapeById(ids.box4)).toBeUndefined()
		expect(editor.getShapeById(ids.frame1)).toBeDefined()
	})

	it('Erases a frame and its children when the frame was the first clicked shape', () => {
		editor.setSelectedTool('eraser')

		const shapesBeforeCount = editor.shapesArray.length

		editor.pointerDown(325, 25) // directly on frame1, not its children
		expect(editor.erasingIdsSet).toEqual(new Set([ids.frame1]))

		editor.pointerUp() // without dragging!

		const shapesAfterCount = editor.shapesArray.length
		expect(shapesAfterCount).toBe(shapesBeforeCount - 2)

		// Erases BOTH the frame and its child
		expect(editor.getShapeById(ids.box4)).toBeUndefined()
		expect(editor.getShapeById(ids.frame1)).toBeUndefined()
	})

	it('Only erases masked shapes when pointer is inside the mask', () => {
		editor.setSelectedTool('eraser')

		const shapesBeforeCount = editor.shapesArray.length

		editor.pointerDown(425, 125) // inside of box4's bounds, but outside of its parent's mask
		expect(editor.erasingIdsSet).toEqual(new Set([]))

		editor.pointerUp() // without dragging!

		const shapesAfterCount = editor.shapesArray.length
		expect(shapesAfterCount).toBe(shapesBeforeCount)

		// Erases NEITHER the frame nor its child
		expect(editor.getShapeById(ids.box4)).toBeDefined()
		expect(editor.getShapeById(ids.frame1)).toBeDefined()
	})

	it('Clears erasing ids and does not erase shapes on cancel', () => {
		editor.setSelectedTool('eraser')
		editor.expectPathToBe('root.eraser.idle')

		const shapesBeforeCount = editor.shapesArray.length

		editor.pointerDown(0, 0) // in box1
		editor.expectPathToBe('root.eraser.pointing')

		expect(editor.erasingIds).toEqual([ids.box1])
		expect(editor.erasingIdsSet).toEqual(new Set([ids.box1]))

		editor.cancel()

		editor.pointerUp()

		const shapesAfterCount = editor.shapesArray.length

		editor.expectPathToBe('root.eraser.idle')

		// Does NOT erase the shape
		expect(editor.erasingIds).toEqual([])
		expect(editor.erasingIdsSet).toEqual(new Set([]))
		expect(editor.getShapeById(ids.box1)).toBeDefined()
		expect(shapesAfterCount).toBe(shapesBeforeCount)
	})

	it('Clears erasing ids and does not erase shapes on interrupt', () => {
		editor.setSelectedTool('eraser')
		editor.expectPathToBe('root.eraser.idle')

		const shapesBeforeCount = editor.shapesArray.length

		editor.pointerDown(0, 0) // near to box1
		editor.expectPathToBe('root.eraser.pointing')

		expect(editor.erasingIds).toEqual([ids.box1])
		expect(editor.erasingIdsSet).toEqual(new Set([ids.box1]))

		editor.interrupt()

		editor.pointerUp()

		const shapesAfterCount = editor.shapesArray.length

		editor.expectPathToBe('root.eraser.idle')

		// Does NOT erase the shape
		expect(editor.erasingIds).toEqual([])
		expect(editor.erasingIdsSet).toEqual(new Set([]))
		expect(editor.getShapeById(ids.box1)).toBeDefined()
		expect(shapesAfterCount).toBe(shapesBeforeCount)
	})
})

describe('When clicking and dragging', () => {
	it('Enters erasing state on pointer move, adds contacted shapes to the apps.erasingIds array / apps.erasingIdsSet, deletes them and clears erasingIds / erasingIdsSet on pointer up, restores shapes on undo and deletes again on redo', () => {
		editor.setSelectedTool('eraser')

		editor.expectPathToBe('root.eraser.idle')

		editor.pointerDown(-100, -100) // outside of any shapes

		editor.expectPathToBe('root.eraser.pointing')
		expect(editor.scribble).toBe(null)

		editor.pointerMove(50, 50) // inside of box1

		editor.expectPathToBe('root.eraser.erasing')

		jest.advanceTimersByTime(16)
		expect(editor.scribble).not.toBe(null)

		expect(editor.erasingIds).toEqual([ids.box1])
		expect(editor.erasingIdsSet).toEqual(new Set([ids.box1]))

		editor.pointerUp()
		editor.expectPathToBe('root.eraser.idle')
		expect(editor.erasingIds).toEqual([])
		expect(editor.erasingIdsSet).toEqual(new Set([]))
		expect(editor.getShapeById(ids.box1)).not.toBeDefined()

		editor.undo()

		expect(editor.erasingIds).toEqual([])
		expect(editor.erasingIdsSet).toEqual(new Set([]))
		expect(editor.getShapeById(ids.box1)).toBeDefined()

		editor.redo()

		expect(editor.erasingIds).toEqual([])
		expect(editor.erasingIdsSet).toEqual(new Set([]))
		expect(editor.getShapeById(ids.box1)).not.toBeDefined()
	})

	it('Clears erasing ids and does not erase shapes on cancel', () => {
		editor.setSelectedTool('eraser')
		editor.expectPathToBe('root.eraser.idle')
		editor.pointerDown(-100, -100) // outside of any shapes
		editor.pointerMove(50, 50) // inside of box1
		jest.advanceTimersByTime(16)
		expect(editor.scribble).not.toBe(null)
		expect(editor.erasingIds).toEqual([ids.box1])
		expect(editor.erasingIdsSet).toEqual(new Set([ids.box1]))
		editor.cancel()
		editor.expectPathToBe('root.eraser.idle')
		expect(editor.erasingIds).toEqual([])
		expect(editor.erasingIdsSet).toEqual(new Set([]))
		expect(editor.getShapeById(ids.box1)).toBeDefined()
	})

	it('Excludes a group if it was hovered when the drag started', () => {
		editor.groupShapes([ids.box2, ids.box3], ids.group1)
		editor.setSelectedTool('eraser')
		editor.expectPathToBe('root.eraser.idle')
		editor.pointerDown(275, 275) // in between box2 AND box3, so over of the new group
		editor.pointerMove(280, 280) // still outside of the new group
		jest.advanceTimersByTime(16)
		expect(editor.scribble).not.toBe(null)
		expect(editor.erasingIds).toEqual([])
		expect(editor.erasingIdsSet).toEqual(new Set([]))
		editor.pointerMove(0, 0)
		expect(editor.erasingIds).toEqual([ids.box1])
		expect(editor.erasingIdsSet).toEqual(new Set([ids.box1]))
		expect(editor.getShapeById(ids.box1)).toBeDefined()
		editor.pointerUp()
		expect(editor.getShapeById(ids.group1)).toBeDefined()
		expect(editor.getShapeById(ids.box1)).not.toBeDefined()
	})

	it('Excludes a frame if it was hovered when the drag started', () => {
		editor.setSelectedTool('eraser')
		editor.pointerDown(325, 25) // directly on frame1, not its children
		editor.pointerMove(350, 375) // still in the frame, passing through box3
		jest.advanceTimersByTime(16)
		expect(editor.scribble).not.toBe(null)
		expect(editor.erasingIds).toEqual([ids.box3])
		expect(editor.erasingIdsSet).toEqual(new Set([ids.box3]))
		editor.pointerUp()
		expect(editor.getShapeById(ids.frame1)).toBeDefined()
		expect(editor.getShapeById(ids.box3)).not.toBeDefined()
	})

	it('Only erases masked shapes when pointer is inside the mask', () => {
		editor.setSelectedTool('eraser')
		editor.pointerDown(425, 0) // Above the masked part of box3
		expect(editor.erasingIds).toEqual([])
		editor.pointerMove(425, 500) // Through the masked part of box3
		jest.advanceTimersByTime(16)
		expect(editor.scribble).not.toBe(null)
		expect(editor.erasingIds).toEqual([])
		expect(editor.erasingIdsSet).toEqual(new Set([]))
		editor.pointerUp()
		expect(editor.getShapeById(ids.box3)).toBeDefined()

		editor.pointerDown(375, 0) // Above the not-masked part of box3
		editor.pointerMove(375, 500) // Through the masked part of box3
		expect(editor.scribble).not.toBe(null)
		expect(editor.erasingIds).toEqual([ids.box3])
		expect(editor.erasingIdsSet).toEqual(new Set([ids.box3]))
		editor.pointerUp()
		expect(editor.getShapeById(ids.box3)).not.toBeDefined()
	})

	it('Does nothing on interrupt, allowing for a pinch during the erasing session', () => {
		editor.setSelectedTool('eraser')
		editor.pointerDown(-100, -100)
		editor.pointerMove(50, 50)
		editor.interrupt()
		editor.expectPathToBe('root.eraser.erasing')
	})

	it('Starts a scribble on pointer down, updates it on pointer move, stops it on exit', () => {
		editor.setSelectedTool('eraser')
		editor.pointerDown(-100, -100)
		expect(editor.scribble).toBe(null)
		editor.pointerMove(50, 50)
		jest.advanceTimersByTime(16)
		expect(editor.scribble).not.toBe(null)
		editor.pointerMove(50, 50)
		editor.pointerMove(51, 50)
		editor.pointerMove(52, 50)
		editor.pointerMove(53, 50)
		editor.pointerUp()
		expect(editor.scribble).not.toBe(null)
	})
})

// Not yet implemented
describe('When shift clicking', () => {
	it.todo('Erases a line between the previous clicked point and the current point')
	it.todo('Clears the previous clicked point when leaving / re-entering the eraser tool')
})

describe('When in the idle state', () => {
	it('Returns to select on cancel', () => {
		editor.setSelectedTool('hand')
		editor.expectPathToBe('root.hand.idle')
		editor.cancel()
		editor.expectPathToBe('root.select.idle')
	})
})
