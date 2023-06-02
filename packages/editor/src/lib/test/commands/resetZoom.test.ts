import { TestEditor } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
})

describe('When resetting zoom', () => {
	it('Resets the zoom when zoomed out', () => {
		const center = app.viewportScreenBounds.center.clone()
		app.zoomOut()
		app.resetZoom()
		expect(app.zoomLevel).toBe(1)
		app.zoomIn()
		app.resetZoom()
		expect(app.zoomLevel).toBe(1)
		expect(app.viewportScreenBounds.center.clone()).toMatchObject(center)
	})

	it('Resets the zoom when zoomed in', () => {
		const center = app.viewportScreenBounds.center.clone()
		app.zoomOut()
		app.resetZoom()
		expect(app.viewportScreenBounds.center.clone()).toMatchObject(center)
		app.zoomIn()
		app.resetZoom()
		expect(app.viewportScreenBounds.center.clone()).toMatchObject(center)
	})
})
