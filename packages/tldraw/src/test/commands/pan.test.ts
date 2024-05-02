import { Box, Vec } from '@tldraw/editor'
import { TestEditor, createDefaultShapes } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
})

describe('When panning', () => {
	it('Updates the camera', () => {
		editor.pan({ x: 200, y: 200 })
		editor.expectCameraToBe(200, 200, 1)
	})

	it('Updates the pageBounds', () => {
		const screenBounds = editor.getViewportScreenBounds()
		const beforeScreenBounds = new Box(
			screenBounds.x,
			screenBounds.y,
			screenBounds.w,
			screenBounds.h
		)
		const beforePageBounds = editor.getViewportPageBounds().clone()
		editor.pan({ x: 200, y: 200 })
		expect(editor.getViewportScreenBounds()).toMatchObject(beforeScreenBounds.toJson())
		expect(editor.getViewportPageBounds().toJson()).toMatchObject(
			beforePageBounds.translate(new Vec(-200, -200)).toJson()
		)
	})
})
