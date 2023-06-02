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
	// zooms in
	expect(app.zoomLevel).toBe(ZOOMS[3])
	app.zoomIn()
	expect(app.zoomLevel).toBe(ZOOMS[4])
	app.zoomIn()
	expect(app.zoomLevel).toBe(ZOOMS[5])
	app.zoomIn()
	expect(app.zoomLevel).toBe(ZOOMS[6])

	// does not zoom in past max
	app.zoomIn()
	expect(app.zoomLevel).toBe(ZOOMS[6])
})

it('zooms to from B to D when B >= (C - A)/2, else zooms from B to C', () => {
	app.setCamera(0, 0, (ZOOMS[2] + ZOOMS[3]) / 2)
	app.zoomIn()
	expect(app.zoomLevel).toBe(ZOOMS[4])
	app.setCamera(0, 0, (ZOOMS[2] + ZOOMS[3]) / 2 - 0.1)
	app.zoomIn()
	expect(app.zoomLevel).toBe(ZOOMS[3])
})

it('does not zoom when camera is frozen', () => {
	app.setCamera(0, 0, 1)
	expect(app.camera).toMatchObject({ x: 0, y: 0, z: 1 })
	app.canMoveCamera = false
	app.zoomIn()
	expect(app.camera).toMatchObject({ x: 0, y: 0, z: 1 })
})
