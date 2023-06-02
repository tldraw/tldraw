import { createCustomShapeId } from '@tldraw/tlschema'
import { TestApp } from './TestEditor'

let app: TestApp

const ids = {
	box1: createCustomShapeId('box1'),
}

beforeEach(() => {
	app = new TestApp()
	app.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
})

it('Sets cursor and state correctly', () => {
	expect(app.cursor.type).toBe('default')
	expect(app.inputs.isPanning).toBe(false)
	app.keyDown(' ')
	expect(app.inputs.isPanning).toBe(true)
	expect(app.cursor.type).toBe('grab')
	app.pointerDown(0, 0)
	expect(app.cursor.type).toBe('grabbing')
	app.pointerUp(0, 0)
	expect(app.cursor.type).toBe('grab')
	app.keyUp(' ')
	expect(app.inputs.isPanning).toBe(false)
	expect(app.cursor.type).toBe('default')
})

it('When holding spacebar and clicking and dragging, it pans the camera', () => {
	app.keyDown(' ')
	app.pointerDown(0, 0)
	app.pointerMove(100, 100)
	app.expectCameraToBe(100, 100, 1)
	app.keyUp(' ')
})

it('When holding spacebar, it updates cursor and does not send events to the state or change statecharts current active state', () => {
	app.pointerDown(50, 50, { target: 'shape', shape: app.getShapeById(ids.box1) })
	app.pointerMove(100, 100)
	app.expectShapeToMatch({ id: ids.box1, x: 150, y: 150 })

	app.keyDown(' ')
	app.pointerMove(200, 200)
	app.expectCameraToBe(100, 100, 1)
	app.keyUp(' ')
})
