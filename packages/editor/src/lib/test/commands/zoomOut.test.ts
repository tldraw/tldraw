import { ZOOMS } from '../../constants'
import { TestApp } from '../TestEditor'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

it('zooms by increments', () => {
	// Starts at 1
	expect(app.zoomLevel).toBe(1)
	expect(app.zoomLevel).toBe(ZOOMS[3])
	app.zoomOut()
	expect(app.zoomLevel).toBe(ZOOMS[2])
	app.zoomOut()
	expect(app.zoomLevel).toBe(ZOOMS[1])
	app.zoomOut()
	expect(app.zoomLevel).toBe(ZOOMS[0])
	// does not zoom out past min
	app.zoomOut()
	expect(app.zoomLevel).toBe(ZOOMS[0])
})

it('does not zoom out when camera is frozen', () => {
	app.setCamera(0, 0, 1)
	expect(app.camera).toMatchObject({ x: 0, y: 0, z: 1 })
	app.canMoveCamera = false
	app.zoomOut()
	expect(app.camera).toMatchObject({ x: 0, y: 0, z: 1 })
})
