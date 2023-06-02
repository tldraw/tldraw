import { Box2d, Vec2d } from '@tldraw/primitives'
import { TestEditor, createDefaultShapes } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
	app.createShapes(createDefaultShapes())
})

describe('When panning', () => {
	it('Updates the camera', () => {
		app.pan(200, 200)
		app.expectCameraToBe(200, 200, 1)
	})

	it('Updates the pageBounds', () => {
		const screenBounds = app.viewportScreenBounds
		const beforeScreenBounds = new Box2d(
			screenBounds.x,
			screenBounds.y,
			screenBounds.w,
			screenBounds.h
		)
		const beforePageBounds = app.viewportPageBounds.clone()
		app.pan(200, 200)
		expect(app.viewportScreenBounds).toMatchObject(beforeScreenBounds.toJson())
		expect(app.viewportPageBounds.toJson()).toMatchObject(
			beforePageBounds.translate(new Vec2d(-200, -200)).toJson()
		)
	})
})
