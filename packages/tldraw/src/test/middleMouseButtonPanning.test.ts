import { createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('When clicking the middle mouse button and dragging, it pans the camera', () => {
	editor.pointerDown(0, 0, { button: 1 })
	editor.pointerMove(100, 100)
	editor.expectCameraToBe(100, 100, 1)
})

it('When clicking the middle mouse button and dragging on a shape, it pans the camera', () => {
	editor.createShapes([
		{
			id: createShapeId(),
			type: 'geo',
			props: {
				geo: 'rectangle',
				w: 100,
				h: 100,
			},
		},
	])
	editor.pointerDown(0, 0, { button: 1 })
	editor.pointerMove(100, 100)
	editor.expectCameraToBe(100, 100, 1)
})
