import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('zooms by increments', () => {
	const zoomStops = editor.camera.getZoomStops()
	// Starts at 1
	expect(editor.getZoomLevel()).toBe(1)
	expect(editor.getZoomLevel()).toBe(zoomStops[3])
	// zooms in
	expect(editor.getZoomLevel()).toBe(zoomStops[3])
	editor.zoomIn()
	expect(editor.getZoomLevel()).toBe(zoomStops[4])
	editor.zoomIn()
	expect(editor.getZoomLevel()).toBe(zoomStops[5])
	editor.zoomIn()
	expect(editor.getZoomLevel()).toBe(zoomStops[6])

	// does not zoom in past max
	editor.zoomIn()
	expect(editor.getZoomLevel()).toBe(zoomStops[6])
})

it('allows customizing the zoom stops', () => {
	const stops = []
	for (let stop = 1; stop <= 8; stop += Math.random()) {
		stops.push(stop)
	}

	editor.camera.setOptions({ zoom: { stops } })
	for (let i = 1; i < stops.length; i++) {
		editor.zoomIn()
		expect(editor.getZoomLevel()).toBe(stops[i])
	}
})

it('preserves the screen center', () => {
	const viewportCenter = editor.getViewportPageCenter().toJson()
	const screenCenter = editor.getViewportScreenCenter().toJson()

	editor.zoomIn()

	expect(editor.getViewportPageCenter().toJson()).toCloselyMatchObject(viewportCenter)
	expect(editor.getViewportScreenCenter().toJson()).toCloselyMatchObject(screenCenter)
})

it('preserves the screen center when offset', () => {
	editor.setScreenBounds({ x: 100, y: 100, w: 1000, h: 1000 })

	const viewportCenter = editor.getViewportPageCenter().toJson()
	const screenCenter = editor.getViewportScreenCenter().toJson()

	editor.zoomIn()

	expect(editor.getViewportPageCenter().toJson()).toCloselyMatchObject(viewportCenter)
	expect(editor.getViewportScreenCenter().toJson()).toCloselyMatchObject(screenCenter)
})

it('zooms to from B to D when B >= (C - A)/2, else zooms from B to C', () => {
	const zoomStops = editor.camera.getZoomStops()
	editor.setCamera({ x: 0, y: 0, z: (zoomStops[2] + zoomStops[3]) / 2 })
	editor.zoomIn()
	expect(editor.getZoomLevel()).toBe(zoomStops[4])
	editor.setCamera({ x: 0, y: 0, z: (zoomStops[2] + zoomStops[3]) / 2 - 0.1 })
	editor.zoomIn()
	expect(editor.getZoomLevel()).toBe(zoomStops[3])
})

it('does not zoom when camera is frozen', () => {
	editor.setCamera({ x: 0, y: 0, z: 1 })
	expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	editor.updateInstanceState({ canMoveCamera: false })
	editor.zoomIn()
	expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
})
