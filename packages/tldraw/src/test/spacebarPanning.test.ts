import { createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { fill: 'solid', w: 100, h: 100 } },
	])
})

it('Sets cursor and state correctly', () => {
	expect(editor.getInstanceState().cursor.type).toBe('default')
	expect(editor.inputs.getIsPanning()).toBe(false)
	editor.keyDown(' ')
	expect(editor.inputs.getIsPanning()).toBe(true)
	expect(editor.getInstanceState().cursor.type).toBe('grab')
	editor.pointerDown(0, 0)
	expect(editor.getInstanceState().cursor.type).toBe('grabbing')
	editor.pointerUp(0, 0)
	expect(editor.getInstanceState().cursor.type).toBe('grab')
	editor.keyUp(' ')
	expect(editor.inputs.getIsPanning()).toBe(false)
	expect(editor.getInstanceState().cursor.type).toBe('default')
})

it('When holding spacebar and clicking and dragging, it pans the camera', () => {
	editor.keyDown(' ')
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100)
	editor.expectCameraToBe(100, 100, 1)
	editor.keyUp(' ')
})

it('When spacebar is held during pointer interaction, it activates panning', () => {
	// This test verifies that holding spacebar prevents pointer events from
	// being sent to the state chart, and instead activates panning mode.
	editor.select(ids.box1)

	// Start with pointer down on the shape
	editor.pointerDown(150, 150, ids.box1)

	// Hold spacebar before moving - should activate panning
	editor.keyDown(' ')
	expect(editor.inputs.getIsPanning()).toBe(true)
	expect(editor.getInstanceState().cursor.type).toBe('grabbing') // 'grabbing' because pointer is down

	// Moving the pointer should pan the camera, not translate the shape
	const initialCamera = editor.getCamera()
	editor.pointerMove(100, 100)

	// Camera should have moved (panning)
	const newCamera = editor.getCamera()
	expect(newCamera.x).not.toBe(initialCamera.x)
	expect(newCamera.y).not.toBe(initialCamera.y)

	// Shape should not have moved (not translating)
	editor.expectShapeToMatch({ id: ids.box1, x: 100, y: 100 })

	editor.pointerUp()
	editor.keyUp(' ')
	expect(editor.inputs.getIsPanning()).toBe(false)
})

it('When holding spacebar, pressing the arrow keys moves over by one viewport', () => {
	editor.keyDown(' ')
	editor.expectCameraToBe(0, 0, 1)
	editor.user.updateUserPreferences({ animationSpeed: 0 })
	expect(editor.getViewportPageBounds()).toEqual({ x: -0, y: -0, w: 1080, h: 720 })
	editor.keyDown('ArrowRight')
	editor.keyUp('ArrowRight')
	expect(editor.getViewportPageBounds()).toEqual({ x: 1080, y: 0, w: 1080, h: 720 })
	editor.keyDown('ArrowDown')
	editor.keyUp('ArrowDown')
	expect(editor.getViewportPageBounds()).toEqual({ x: 1080, y: 720, w: 1080, h: 720 })
	editor.keyUp(' ')
})
