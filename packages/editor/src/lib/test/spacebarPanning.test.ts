import { createShapeId } from '@tldraw/tlschema'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
})

it('Sets cursor and state correctly', () => {
	expect(editor.cursor.type).toBe('default')
	expect(editor.inputs.isPanning).toBe(false)
	editor.keyDown(' ')
	expect(editor.inputs.isPanning).toBe(true)
	expect(editor.cursor.type).toBe('grab')
	editor.pointerDown(0, 0)
	expect(editor.cursor.type).toBe('grabbing')
	editor.pointerUp(0, 0)
	expect(editor.cursor.type).toBe('grab')
	editor.keyUp(' ')
	expect(editor.inputs.isPanning).toBe(false)
	expect(editor.cursor.type).toBe('default')
})

it('When holding spacebar and clicking and dragging, it pans the camera', () => {
	editor.keyDown(' ')
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100)
	editor.expectCameraToBe(100, 100, 1)
	editor.keyUp(' ')
})

it('When holding spacebar, it updates cursor and does not send events to the state or change statecharts current active state', () => {
	editor.pointerDown(50, 50, { target: 'shape', shape: editor.getShapeById(ids.box1) })
	editor.pointerMove(100, 100)
	editor.expectShapeToMatch({ id: ids.box1, x: 150, y: 150 })

	editor.keyDown(' ')
	editor.pointerMove(200, 200)
	editor.expectCameraToBe(100, 100, 1)
	editor.keyUp(' ')
})
