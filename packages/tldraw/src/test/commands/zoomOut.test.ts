import { DEFAULT_CAMERA_OPTIONS } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('zooms out and in by increments', () => {
	const cameraOptions = DEFAULT_CAMERA_OPTIONS

	// Starts at 1
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[3])
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[2])
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[1])
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[0])
	// does not zoom out past min
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[0])
})

it('does not zoom out when camera is frozen', () => {
	editor.setCamera({ x: 0, y: 0, z: 1 })
	expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	editor.setCameraOptions({ isLocked: true })
	editor.zoomOut()
	expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
})
