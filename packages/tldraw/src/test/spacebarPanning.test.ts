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
	expect(editor.instanceState.cursor.type).toBe('default')
	expect(editor.inputs.isPanning).toBe(false)
	editor.keyDown(' ')
	expect(editor.inputs.isPanning).toBe(true)
	expect(editor.instanceState.cursor.type).toBe('grab')
	editor.pointerDown(0, 0)
	expect(editor.instanceState.cursor.type).toBe('grabbing')
	editor.pointerUp(0, 0)
	expect(editor.instanceState.cursor.type).toBe('grab')
	editor.keyUp(' ')
	expect(editor.inputs.isPanning).toBe(false)
	expect(editor.instanceState.cursor.type).toBe('default')
})

it('When holding spacebar and clicking and dragging, it pans the camera', () => {
	editor.keyDown(' ')
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100)
	editor.expectCameraToBe(100, 100, 1)
	editor.keyUp(' ')
})

it('When holding spacebar, it updates cursor and does not send events to the state or change statecharts current active state', () => {
	editor.pointerDown(150, 150, { target: 'canvas' })
	editor.pointerMove(100, 100)
	editor.expectShapeToMatch({ id: ids.box1, x: 50, y: 50 })

	editor.keyDown(' ')
	editor.pointerMove(200, 200)
	editor.expectCameraToBe(100, 100, 1)
	editor.expectShapeToMatch({ id: ids.box1, x: 50, y: 50 })
	editor.keyUp(' ')
})
