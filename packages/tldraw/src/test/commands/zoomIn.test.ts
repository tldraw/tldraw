import { DEFAULT_CAMERA_OPTIONS } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('zooms by increments', () => {
	const cameraOptions = DEFAULT_CAMERA_OPTIONS

	// Starts at 1
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[4])
	editor.zoomIn()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[5])
	editor.zoomIn()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[6])
	editor.zoomIn()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[7])
	// does not zoom out past min
	editor.zoomIn()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[7])
})

it('is ignored by undo/redo', () => {
	const cameraOptions = editor.getCameraOptions()

	editor.markHistoryStoppingPoint()
	editor.zoomIn()
	editor.undo()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[5])
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
	const cameraOptions = DEFAULT_CAMERA_OPTIONS

	editor.setCamera({ x: 0, y: 0, z: (cameraOptions.zoomSteps[2] + cameraOptions.zoomSteps[3]) / 2 })
	editor.zoomIn()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[4])
	editor.setCamera({
		x: 0,
		y: 0,
		z: (cameraOptions.zoomSteps[2] + cameraOptions.zoomSteps[3]) / 2 - 0.1,
	})
	editor.zoomIn()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[3])
})

it('does not zoom when camera is frozen', () => {
	editor.setCamera({ x: 0, y: 0, z: 1 })
	expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	editor.setCameraOptions({ isLocked: true })
	editor.zoomIn()
	expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
})
