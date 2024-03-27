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
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(zoomStops[2])
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(zoomStops[1])
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(zoomStops[0])
	// does not zoom out past min
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(zoomStops[0])
})

it('allows customizing the zoom stops', () => {
	const stops = []
	for (let stop = 1; stop >= 0.1; stop *= 0.5 + 0.5 * Math.random()) {
		stops.push(stop)
	}
	stops.reverse()

	editor.camera.setOptions({ zoom: { stops } })
	for (let i = stops.length - 2; i >= 0; i--) {
		editor.zoomOut()
		expect(editor.getZoomLevel()).toBe(stops[i])
	}
})

it('does not zoom out when camera is frozen', () => {
	editor.setCamera({ x: 0, y: 0, z: 1 })
	expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	editor.updateInstanceState({ canMoveCamera: false })
	editor.zoomOut()
	expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
})
