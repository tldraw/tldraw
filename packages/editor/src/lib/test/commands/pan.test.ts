import { Box2d, Vec2d } from '@tldraw/primitives'
import { TestEditor, createDefaultShapes } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
})

describe('When panning', () => {
	it('Updates the camera', () => {
		editor.pan(200, 200)
		editor.expectCameraToBe(200, 200, 1)
	})

	it('Updates the pageBounds', () => {
		const screenBounds = editor.viewportScreenBounds
		const beforeScreenBounds = new Box2d(
			screenBounds.x,
			screenBounds.y,
			screenBounds.w,
			screenBounds.h
		)
		const beforePageBounds = editor.viewportPageBounds.clone()
		editor.pan(200, 200)
		expect(editor.viewportScreenBounds).toMatchObject(beforeScreenBounds.toJson())
		expect(editor.viewportPageBounds.toJson()).toMatchObject(
			beforePageBounds.translate(new Vec2d(-200, -200)).toJson()
		)
	})
})
