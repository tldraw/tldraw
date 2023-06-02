import { TestApp } from './TestEditor'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

it('When clicking the middle mouse button and dragging, it pans the camera', () => {
	app.pointerDown(0, 0, { button: 1 })
	app.pointerMove(100, 100)
	app.expectCameraToBe(100, 100, 1)
})

it('When clicking the middle mouse button and dragging on a shape, it pans the camera', () => {
	app.createShapes([
		{
			id: app.createShapeId(),
			type: 'geo',
			props: {
				geo: 'rectangle',
				w: 100,
				h: 100,
			},
		},
	])
	app.pointerDown(0, 0, { button: 1 })
	app.pointerMove(100, 100)
	app.expectCameraToBe(100, 100, 1)
})
