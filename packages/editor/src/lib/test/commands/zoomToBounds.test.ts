import { TestEditor } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
})

describe('When zooming to bounds', () => {
	it('centers the camera on the new bounds', () => {
		expect(app.viewportPageCenter).toMatchObject({ x: 540, y: 360 })

		app.setScreenBounds({ x: 0, y: 0, w: 1000, h: 1000 })
		app.setCamera(0, 0, 1)
		app.zoomToBounds(200, 300, 300, 300)
		expect(app.viewportPageCenter.toJson()).toCloselyMatchObject({ x: 350, y: 450 })
	})
})

it('does not zoom past max', () => {
	app.zoomToBounds(0, 0, 1, 1)
	expect(app.zoomLevel).toBe(8)
})

it('does not zoom past min', () => {
	app.zoomToBounds(0, 0, 1000000, 100000)
	expect(app.zoomLevel).toBe(0.1)
})

it('does not zoom to bounds when camera is frozen', () => {
	app.setScreenBounds({ x: 0, y: 0, w: 1000, h: 1000 })
	expect(app.viewportPageCenter.toJson()).toCloselyMatchObject({ x: 500, y: 500 })
	app.canMoveCamera = false
	app.zoomToBounds(200, 300, 300, 300)
	expect(app.viewportPageCenter.toJson()).toCloselyMatchObject({ x: 500, y: 500 })
})
