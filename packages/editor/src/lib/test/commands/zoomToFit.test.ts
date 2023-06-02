import { createDefaultShapes, TestEditor } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
	app.createShapes(createDefaultShapes())
})

it('converts correctly', () => {
	app.zoomToFit()
	expect({ ...app.camera, id: 'static' }).toMatchSnapshot('Zoom to Fit Camera')
})

it('does not zoom to bounds when camera is frozen', () => {
	const cameraBefore = { ...app.camera }
	app.canMoveCamera = false
	app.zoomToFit()
	expect(app.camera).toMatchObject(cameraBefore)
})
