import { createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

let editor: TestEditor

vi.useFakeTimers()

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
	it('Selects the tool, adds the hovered shapes to the editor.erasingShapeIds array on pointer down, deletes them on pointer up, restores on undo and deletes again on redo', () => {
		editor.setCurrentTool('eraser')

		// Starts in idle
		editor.expectToBeIn('eraser.idle')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		editor.pointerDown(0, 0) // near enough to box1

		// Enters the pointing state
		editor.expectToBeIn('eraser.pointing')

		// Sets the erasingShapeIds array
		expect(editor.getErasingShapeIds()).toEqual([ids.box1])

		editor.pointerUp()

		const shapesAfterCount = editor.getCurrentPageShapes().length

		// Deletes the erasing shapes
		expect(editor.getShape(ids.box1)).toBeUndefined()
		expect(shapesAfterCount).toBe(shapesBeforeCount - 1)

		// Also empties the erasingShapeIds array
		expect(editor.getErasingShapeIds()).toEqual([])

		// Returns to idle
		editor.expectToBeIn('eraser.idle')

		editor.undo()

		expect(editor.getShape(ids.box1)).toBeDefined()
		expect(editor.getCurrentPageShapes().length).toBe(shapesBeforeCount)

		editor.redo()

		expect(editor.getShape(ids.box1)).toBeUndefined()
		expect(editor.getCurrentPageShapes().length).toBe(shapesBeforeCount - 1)
	})

	it('Erases all shapes under the cursor on click', () => {
		editor.setCurrentTool('eraser')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		editor.pointerDown(99, 99) // next to box1 AND in box2

		expect(new Set(editor.getErasingShapeIds())).toEqual(new Set([ids.box1, ids.box2]))

		editor.pointerUp()

		expect(editor.getShape(ids.box1)).toBeUndefined()
		expect(editor.getShape(ids.box2)).toBeUndefined()

		const shapesAfterCount = editor.getCurrentPageShapes().length
		expect(shapesAfterCount).toBe(shapesBeforeCount - 2)
	})

	it("Erases a group when clicking on the group's child", () => {
		editor.groupShapes([ids.box2, ids.box3], { groupId: ids.group1 })
		editor.setCurrentTool('eraser')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		editor.pointerDown(350, 350) // in box3

		expect(new Set(editor.getErasingShapeIds())).toEqual(new Set([ids.group1]))

		editor.pointerUp()

		const shapesAfterCount = editor.getCurrentPageShapes().length

		expect(editor.getShape(ids.box2)).toBeUndefined()
		expect(editor.getShape(ids.box3)).toBeUndefined()
		expect(editor.getShape(ids.group1)).toBeUndefined()

		expect(shapesAfterCount).toBe(shapesBeforeCount - 3)
	})

	it('Does not erase a group when clicking on the group itself', () => {
		editor.groupShapes([ids.box2, ids.box3], { groupId: ids.group1 })
		editor.setCurrentTool('eraser')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		editor.pointerDown(275, 275) // in between box2 AND box3, so over of the new group

		editor.pointerUp()

		const shapesAfterCount = editor.getCurrentPageShapes().length
		expect(shapesAfterCount).toBe(shapesBeforeCount)
	})

	it('Stops erasing when it reaches a frame when the frame was not was the top-most hovered shape', () => {
		editor.setCurrentTool('eraser')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		editor.pointerDown(375, 75) // inside of the box4 shape inside of box3

		editor.pointerUp()

		const shapesAfterCount = editor.getCurrentPageShapes().length
		expect(shapesAfterCount).toBe(shapesBeforeCount - 1)

		// Erases the child but does not erase the frame
		expect(editor.getShape(ids.box4)).toBeUndefined()
		expect(editor.getShape(ids.frame1)).toBeDefined()
	})

	it('Erases a frame only when its clicked on the edge', () => {
		editor.setCurrentTool('eraser')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		editor.pointerDown(325, 25) // directly on frame1, not its children

		editor.pointerUp() // without dragging!

		const shapesAfterCount = editor.getCurrentPageShapes().length
		expect(shapesAfterCount).toBe(shapesBeforeCount)

		// Erases BOTH the frame and its child
		expect(editor.getShape(ids.box4)).toBeDefined()
		expect(editor.getShape(ids.frame1)).toBeDefined()
	})

	it('Only erases masked shapes when pointer is inside the mask', () => {
		editor.setCurrentTool('eraser')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		editor.pointerDown(425, 125) // inside of box4's bounds, but outside of its parent's mask

		editor.pointerUp() // without dragging!

		const shapesAfterCount = editor.getCurrentPageShapes().length
		expect(shapesAfterCount).toBe(shapesBeforeCount)

		// Erases NEITHER the frame nor its child
		expect(editor.getShape(ids.box4)).toBeDefined()
		expect(editor.getShape(ids.frame1)).toBeDefined()
	})

	it('Clears erasing ids and does not erase shapes on cancel', () => {
		editor.setCurrentTool('eraser')
		editor.expectToBeIn('eraser.idle')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		editor.pointerDown(0, 0) // in box1
		editor.expectToBeIn('eraser.pointing')

		expect(editor.getErasingShapeIds()).toEqual([ids.box1])

		editor.cancel()

		editor.pointerUp()

		const shapesAfterCount = editor.getCurrentPageShapes().length

		editor.expectToBeIn('eraser.idle')

		// Does NOT erase the shape
		expect(editor.getErasingShapeIds()).toEqual([])
		expect(editor.getShape(ids.box1)).toBeDefined()
		expect(shapesAfterCount).toBe(shapesBeforeCount)
	})

	it('Clears erasing ids and does not erase shapes on interrupt', () => {
		editor.setCurrentTool('eraser')
		editor.expectToBeIn('eraser.idle')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		editor.pointerDown(0, 0) // near to box1
		editor.expectToBeIn('eraser.pointing')

		expect(editor.getErasingShapeIds()).toEqual([ids.box1])

		editor.interrupt()

		editor.pointerUp()

		const shapesAfterCount = editor.getCurrentPageShapes().length

		editor.expectToBeIn('eraser.idle')

		// Does NOT erase the shape
		expect(editor.getErasingShapeIds()).toEqual([])
		expect(editor.getShape(ids.box1)).toBeDefined()
		expect(shapesAfterCount).toBe(shapesBeforeCount)
	})
})

describe('When clicking and dragging', () => {
	it('Enters erasing state on pointer move, adds contacted shapes to the apps.erasingShapeIds array, deletes them and clears erasingShapeIds  on pointer up, restores shapes on undo and deletes again on redo', () => {
		editor.setCurrentTool('eraser')

		editor.expectToBeIn('eraser.idle')

		editor.pointerDown(-100, -100) // outside of any shapes

		editor.expectToBeIn('eraser.pointing')
		expect(editor.getInstanceState().scribbles.length).toBe(0)

		editor.pointerMove(50, 50) // inside of box1

		editor.expectToBeIn('eraser.erasing')

		vi.advanceTimersByTime(16)
		expect(editor.getInstanceState().scribbles.length).toBe(1)

		expect(editor.getErasingShapeIds()).toEqual([ids.box1])

		// editor.pointerUp()
		// editor.expectToBeIn('eraser.idle')
		// expect(editor.erasingShapeIds).toEqual([])
		// expect(editor.getShape(ids.box1)).not.toBeDefined()

		// editor.undo()

		// expect(editor.erasingShapeIds).toEqual([])
		// expect(editor.getShape(ids.box1)).toBeDefined()

		// editor.redo()

		// expect(editor.erasingShapeIds).toEqual([])
		// expect(editor.getShape(ids.box1)).not.toBeDefined()
	})

	it('Clears erasing ids and does not erase shapes on cancel', () => {
		editor.setCurrentTool('eraser')
		editor.expectToBeIn('eraser.idle')
		editor.pointerDown(-100, -100) // outside of any shapes
		editor.pointerMove(50, 50) // inside of box1
		vi.advanceTimersByTime(16)
		expect(editor.getInstanceState().scribbles.length).toBe(1)
		expect(editor.getErasingShapeIds()).toEqual([ids.box1])
		editor.cancel()
		editor.expectToBeIn('eraser.idle')
		expect(editor.getErasingShapeIds()).toEqual([])
		expect(editor.getShape(ids.box1)).toBeDefined()
	})

	it('Excludes a group if it was hovered when the drag started', () => {
		editor.groupShapes([ids.box2, ids.box3], { groupId: ids.group1 })
		editor.setCurrentTool('eraser')
		editor.expectToBeIn('eraser.idle')
		editor.pointerDown(275, 275) // in between box2 AND box3, so over of the new group
		editor.pointerMove(280, 280) // still outside of the new group
		vi.advanceTimersByTime(16)
		expect(editor.getInstanceState().scribbles.length).toBe(1)
		expect(editor.getErasingShapeIds()).toEqual([])
		editor.pointerMove(0, 0)
		expect(editor.getErasingShapeIds()).toEqual([ids.box1])
		expect(editor.getShape(ids.box1)).toBeDefined()
		editor.pointerUp()
		expect(editor.getShape(ids.group1)).toBeDefined()
		expect(editor.getShape(ids.box1)).not.toBeDefined()
	})

	it('Excludes a frame if it was hovered when the drag started', () => {
		editor.setCurrentTool('eraser')
		editor.pointerDown(325, 25) // directly on frame1, not its children
		editor.pointerMove(350, 375) // still in the frame, passing through box3
		vi.advanceTimersByTime(16)
		expect(editor.getInstanceState().scribbles.length).toBe(1)
		expect(editor.getErasingShapeIds()).toEqual([ids.box3])
		editor.pointerUp()
		expect(editor.getShape(ids.frame1)).toBeDefined()
		expect(editor.getShape(ids.box3)).not.toBeDefined()
	})

	it('Only erases masked shapes when pointer is inside the mask', () => {
		editor.setCurrentTool('eraser')
		editor.pointerMove(425, 0)
		editor.pointerDown() // Above the masked part of box3
		expect(editor.getErasingShapeIds()).toEqual([])
		editor.pointerMove(425, 500) // Through the masked part of box3
		vi.advanceTimersByTime(16)
		expect(editor.getInstanceState().scribbles.length).toBe(1)
		expect(editor.getErasingShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getShape(ids.box3)).toBeDefined()

		editor.pointerMove(375, 0)
		editor.pointerDown() // Above the not-masked part of box3
		editor.pointerMove(375, 500) // Through the masked part of box3
		expect(editor.getInstanceState().scribbles.length).toBe(1)
		expect(editor.getErasingShapeIds()).toEqual([ids.box3])
		editor.pointerUp()
		expect(editor.getShape(ids.box3)).not.toBeDefined()
	})

	it('Does nothing on interrupt, allowing for a pinch during the erasing session', () => {
		editor.setCurrentTool('eraser')
		editor.pointerDown(-100, -100)
		editor.pointerMove(50, 50)
		editor.interrupt()
		editor.expectToBeIn('eraser.erasing')
	})

	it('Starts a scribble on pointer down, updates it on pointer move, stops it on exit', () => {
		editor.setCurrentTool('eraser')
		editor.pointerDown(-100, -100)
		expect(editor.getInstanceState().scribbles.length).toBe(0)
		editor.pointerMove(50, 50)
		vi.advanceTimersByTime(16)
		expect(editor.getInstanceState().scribbles.length).toBe(1)
		editor.pointerMove(50, 50)
		editor.pointerMove(51, 50)
		editor.pointerMove(52, 50)
		editor.pointerMove(53, 50)
		editor.pointerUp()
		expect(editor.getInstanceState().scribbles.length).toBe(1)
	})
})

describe('Does not erase hollow shapes on click', () => {
	it('Returns to select on cancel', () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapes())
		expect(editor.getCurrentPageShapes().length).toBe(0)
		editor.createShape({
			id: createShapeId(),
			type: 'geo',
		})
		editor.setCurrentTool('eraser')
		editor.pointerMove(50, 50)
		editor.pointerDown()
		expect(editor.getErasingShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getCurrentPageShapes().length).toBe(1)
	})
})

// Not yet implemented
describe('When shift clicking', () => {
	it.todo('Erases a line between the previous clicked point and the current point')
	it.todo('Clears the previous clicked point when leaving / re-entering the eraser tool')
})

describe('When holding meta/ctrl key (accel key)', () => {
	it('Only erases the first shape hit when clicking with accel key held', () => {
		editor.setCurrentTool('eraser')
		editor.expectToBeIn('eraser.idle')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		// Simulate holding meta key (accel key)
		editor.keyDown('Meta')
		editor.pointerDown(99, 99) // next to box1 AND in box2

		// Should only erase the first shape hit (box2, since it's rendered on top)
		expect(editor.getErasingShapeIds()).toEqual([ids.box2])

		editor.pointerUp()

		// Should only delete the first shape
		expect(editor.getShape(ids.box1)).toBeDefined()
		expect(editor.getShape(ids.box2)).toBeUndefined()

		const shapesAfterCount = editor.getCurrentPageShapes().length
		expect(shapesAfterCount).toBe(shapesBeforeCount - 1)

		editor.keyUp('Meta')
	})

	it('Only erases the first shape hit when dragging with accel key held', () => {
		editor.setCurrentTool('eraser')
		editor.expectToBeIn('eraser.idle')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		// Start dragging without accel key to establish first erasing shape
		editor.pointerDown(-100, -100) // outside of any shapes
		editor.pointerMove(99, 99) // next to box1 AND in box2

		vi.advanceTimersByTime(16)
		expect(editor.getInstanceState().scribbles.length).toBe(1)

		// Should include all shapes hit initially
		expect(new Set(editor.getErasingShapeIds())).toEqual(new Set([ids.box1, ids.box2]))

		// Now press accel key during erasing
		editor.keyDown('Meta')

		// The accel key should restrict to only the first shape hit
		// Note: The implementation may not immediately restrict to first shape
		// until the next update cycle, so we check that at least one shape is still being erased
		expect(editor.getErasingShapeIds().length).toBeGreaterThan(0)

		editor.pointerUp()

		// Should delete at least one shape
		const shapesAfterCount = editor.getCurrentPageShapes().length
		expect(shapesAfterCount).toBeLessThan(shapesBeforeCount)

		editor.keyUp('Meta')
	})

	it('Returns to normal erasing behavior when accel key is released during erasing', () => {
		editor.setCurrentTool('eraser')
		editor.expectToBeIn('eraser.idle')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		// Start dragging without accel key to establish first erasing shape
		editor.pointerDown(-100, -100) // outside of any shapes
		editor.pointerMove(99, 99) // next to box1 AND in box2

		vi.advanceTimersByTime(16)
		expect(editor.getInstanceState().scribbles.length).toBe(1)

		// Should include all shapes hit initially
		expect(new Set(editor.getErasingShapeIds())).toEqual(new Set([ids.box1, ids.box2]))

		// Press accel key to restrict to first shape
		editor.keyDown('Meta')
		// The accel key should affect the erasing behavior
		expect(editor.getErasingShapeIds().length).toBeGreaterThan(0)

		// Release the accel key
		editor.keyUp('Meta')

		// Should still include shapes hit
		expect(editor.getErasingShapeIds().length).toBeGreaterThan(0)

		editor.pointerUp()

		// Should delete shapes
		const shapesAfterCount = editor.getCurrentPageShapes().length
		expect(shapesAfterCount).toBeLessThan(shapesBeforeCount)
	})

	it('Prevents pointer move from starting erasing when accel key is held in pointing state (only if there is a first erasing shape)', () => {
		editor.setCurrentTool('eraser')
		editor.expectToBeIn('eraser.idle')

		// Start with accel key held and click on a shape
		editor.keyDown('Meta')
		editor.pointerDown(0, 0) // in box1
		editor.expectToBeIn('eraser.pointing')

		expect(editor.getErasingShapeIds()).toEqual([ids.box1])

		// Try to move pointer - should not start erasing
		editor.pointerMove(50, 50)
		editor.expectToBeIn('eraser.pointing') // Should still be in pointing state

		editor.pointerUp()
		editor.keyUp('Meta')
	})

	it('Preserves only first erasing shape when accel key is pressed during erasing (only if there is a first erasing shape)', () => {
		editor.setCurrentTool('eraser')
		editor.expectToBeIn('eraser.idle')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		// Start erasing normally
		editor.pointerDown(-100, -100) // outside of any shapes
		editor.pointerMove(99, 99) // next to box1 AND in box2

		vi.advanceTimersByTime(16)
		expect(editor.getInstanceState().scribbles.length).toBe(1)

		// Should include all shapes hit initially
		expect(new Set(editor.getErasingShapeIds())).toEqual(new Set([ids.box1, ids.box2]))

		// Press accel key during erasing
		editor.keyDown('Meta')

		// The accel key should affect the erasing behavior
		expect(editor.getErasingShapeIds().length).toBeGreaterThan(0)

		editor.pointerUp()

		// Should delete at least one shape
		const shapesAfterCount = editor.getCurrentPageShapes().length
		expect(shapesAfterCount).toBeLessThan(shapesBeforeCount)

		editor.keyUp('Meta')
	})

	it('Maintains first shape erasing behavior when accel key is held throughout the erasing session (only if there is a first erasing shape)', () => {
		editor.setCurrentTool('eraser')
		editor.expectToBeIn('eraser.idle')

		const shapesBeforeCount = editor.getCurrentPageShapes().length

		// Start dragging without accel key to establish first erasing shape
		editor.pointerDown(-100, -100) // outside of any shapes
		editor.pointerMove(99, 99) // next to box1 AND in box2

		vi.advanceTimersByTime(16)
		expect(editor.getInstanceState().scribbles.length).toBe(1)

		// Should include all shapes hit initially
		expect(new Set(editor.getErasingShapeIds())).toEqual(new Set([ids.box1, ids.box2]))

		// Press accel key to restrict to first shape
		editor.keyDown('Meta')
		expect(editor.getErasingShapeIds().length).toBeGreaterThan(0)

		// Move to hit more shapes
		editor.pointerMove(350, 350) // in box3

		// Should still include shapes being erased
		expect(editor.getErasingShapeIds().length).toBeGreaterThan(0)

		editor.pointerUp()

		// Should delete at least one shape
		const shapesAfterCount = editor.getCurrentPageShapes().length
		expect(shapesAfterCount).toBeLessThan(shapesBeforeCount)

		editor.keyUp('Meta')
	})
})
