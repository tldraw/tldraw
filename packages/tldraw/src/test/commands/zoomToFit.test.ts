import { TestEditor, createDefaultShapes } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
})

it('converts correctly', () => {
	editor.zoomToFit()
	expect({ ...editor.getCamera(), id: 'static' }).toMatchSnapshot('Zoom to Fit Camera')
})

it('does not zoom to bounds when camera is frozen', () => {
	const cameraBefore = { ...editor.getCamera() }
	editor.setCameraOptions({ isLocked: true })
	editor.zoomToFit()
	expect(editor.getCamera()).toMatchObject(cameraBefore)
})

it('is ignored by undo/redo', () => {
	editor.markHistoryStoppingPoint()
	editor.zoomToFit()
	const camera = editor.getCamera()
	editor.undo()
	expect(editor.getCamera()).toBe(camera)
})

it('does not zoom when lock mode toggled', () => {
	const cameraOptions = editor.getCameraOptions()

	// Starts at 1
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[3])
	editor.toggleZoom()
	editor.zoomToFit()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[3])
})
