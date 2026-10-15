import { Box, createShapeId } from '@tldraw/editor'
import { startEditingAdjacentNote } from '../lib/shapes/note/noteHelpers'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.user.updateUserPreferences({ animationSpeed: 1 })
})

function startPan() {
	editor.setCamera({ x: 500, y: 500, z: 1 }, { animation: { duration: 200 } })
	editor.forceTick(2)
	expect(editor.getCameraState()).toBe('moving')
}

describe('pointer down during a camera animation (#10706)', () => {
	it('stops the animation where it is', () => {
		startPan()
		editor.pointerDown(100, 100)
		const cameraAtPointerDown = editor.getCamera()

		editor.forceTick(20)

		expect(editor.getCameraState()).toBe('idle')
		expect(editor.getCamera()).toMatchObject({ x: cameraAtPointerDown.x, y: cameraAtPointerDown.y })
		expect(editor.getCamera()).not.toMatchObject({ x: 500, y: 500 })
	})

	it('does not start a drag while the pointer is held still', () => {
		startPan()
		editor.pointerDown(100, 100)
		editor.forceTick(20)

		expect(editor.inputs.getIsDragging()).toBe(false)
		expect(editor.getPath()).toBe('select.pointing_canvas')
	})

	it('still treats the interaction as a click on a shape', () => {
		const id = createShapeId()
		editor.createShape({ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100, fill: 'solid' } })

		startPan()
		const point = editor.pageToScreen({ x: 50, y: 50 })
		editor.pointerDown(point.x, point.y)
		editor.forceTick(20)
		editor.pointerUp()

		expect(editor.getSelectedShapeIds()).toEqual([id])
		expect(editor.getShape(id)).toMatchObject({ x: 0, y: 0 })
		expect(editor.getPath()).toBe('select.idle')
	})

	it('still starts a drag once the pointer itself moves past the threshold', () => {
		startPan()
		editor.pointerDown(100, 100)
		editor.forceTick(20)
		expect(editor.inputs.getIsDragging()).toBe(false)

		editor.pointerMove(110, 110)
		expect(editor.inputs.getIsDragging()).toBe(true)
	})

	it('stops a fling', () => {
		editor.slideCamera({ speed: 5, direction: { x: 1, y: 1 }, friction: 0.01 })
		editor.forceTick(2)
		expect(editor.getCameraState()).toBe('moving')

		editor.pointerDown(100, 100)
		const cameraAtPointerDown = editor.getCamera()
		editor.forceTick(20)

		expect(editor.getCameraState()).toBe('idle')
		expect(editor.getCamera()).toMatchObject({ x: cameraAtPointerDown.x, y: cameraAtPointerDown.y })
		expect(editor.inputs.getIsDragging()).toBe(false)
	})
})

describe('clicking a note while the camera pans to an adjacent note (#10706)', () => {
	it('moves editing into the clicked note instead of dragging it', () => {
		editor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
		const a = createShapeId('a')
		const b = createShapeId('b')
		editor.createShapes([
			{ id: a, type: 'note', x: 100, y: 100 },
			{ id: b, type: 'note', x: 1500, y: 100 },
		])

		// What Tab does: edit the new note and pan to it, since it is off screen
		startEditingAdjacentNote(editor, editor.getShape(b)!)
		editor.expectToBeIn('select.editing_shape')
		editor.forceTick(2)
		expect(editor.getCameraState()).toBe('moving')

		const point = editor.pageToScreen({ x: 200, y: 200 })
		editor.pointerDown(point.x, point.y)
		editor.forceTick(20)
		editor.pointerUp()

		expect(editor.getEditingShapeId()).toBe(a)
		expect(editor.getShape(a)).toMatchObject({ x: 100, y: 100 })
	})
})

describe('pointer held still while the user scrolls the wheel', () => {
	it('starts a drag once the camera has moved past the threshold', () => {
		editor.pointerDown(100, 100)
		editor.wheel(2, 2)
		expect(editor.inputs.getIsDragging()).toBe(false)
		editor.wheel(10, 10)
		expect(editor.inputs.getIsDragging()).toBe(true)
	})
})
