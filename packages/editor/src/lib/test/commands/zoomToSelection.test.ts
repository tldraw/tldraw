import { createCustomShapeId } from '@tldraw/tlschema'
import { createDefaultShapes, TestApp } from '../TestEditor'

let app: TestApp

const ids = {
	box1: createCustomShapeId('box1'),
	box2: createCustomShapeId('box2'),
}

beforeEach(() => {
	app = new TestApp()
	app.createShapes(createDefaultShapes())
})

it('zooms to selection bounds', () => {
	app.setSelectedIds([ids.box1, ids.box2])
	app.zoomToSelection()
	app.expectCameraToBe(354.64, 139.29, 1)
})

it('does not zoom past max', () => {
	app.updateShapes([{ id: ids.box1, type: 'geo', props: { w: 1, h: 1 } }])
	app.select(ids.box1)
	app.zoomToSelection()
	expect(app.zoomLevel).toBe(1) // double check again when we're zooming in hard
})

it('does not zoom past min', () => {
	app.updateShapes([{ id: ids.box1, type: 'geo', props: { w: 100000, h: 100000 } }])
	app.select(ids.box1)
	app.zoomToSelection()
	expect(app.zoomLevel).toBe(0.1)
})

it('does not zoom to selection when camera is frozen', () => {
	const cameraBefore = { ...app.camera }
	app.canMoveCamera = false
	app.setSelectedIds([ids.box1, ids.box2])
	app.zoomToSelection()
	expect(app.camera).toMatchObject(cameraBefore)
})
