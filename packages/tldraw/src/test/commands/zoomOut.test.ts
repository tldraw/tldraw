import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('zooms out and in by increments', () => {
	const cameraOptions = editor.getCameraOptions()

	// Starts at 1
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[4])
	editor.zoomOut()
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

it('is ignored by undo/redo', () => {
	const cameraOptions = editor.getCameraOptions()

	editor.markHistoryStoppingPoint()
	editor.zoomOut()
	editor.undo()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[3])
})

it('does not zoom out when camera is frozen', () => {
	editor.setCamera({ x: 0, y: 0, z: 1 })
	expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	editor.setCameraOptions({ isLocked: true })
	editor.zoomOut()
	expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
})

it('zooms out and in by increments when the camera options have constraints but no base zoom', () => {
	const cameraOptions = editor.getCameraOptions()
	editor.setCameraOptions({
		...cameraOptions,
		constraints: {
			bounds: { x: 0, y: 0, w: 1600, h: 900 },
			padding: { x: 0, y: 0 },
			origin: { x: 0.5, y: 0.5 },
			initialZoom: 'default',
			baseZoom: 'default',
			behavior: 'free',
		},
	})
	// Starts at 1
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[4])
	editor.zoomOut()
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

it('zooms out and in by increments when the camera options have constraints and a base zoom', () => {
	const cameraOptions = editor.getCameraOptions()
	const vsb = editor.getViewportScreenBounds()
	editor.setCameraOptions({
		...cameraOptions,
		constraints: {
			bounds: { x: 0, y: 0, w: vsb.w * 2, h: vsb.h * 4 },
			padding: { x: 0, y: 0 },
			origin: { x: 0.5, y: 0.5 },
			initialZoom: 'fit-x',
			baseZoom: 'fit-x',
			behavior: 'free',
		},
	})
	// And reset the zoom to its initial value
	editor.resetZoom()

	expect(editor.getInitialZoom()).toBe(0.5) // fitting the x axis
	// Starts at 1
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[4] * 0.5)
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[3] * 0.5)
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[2] * 0.5)
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[1] * 0.5)
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[0] * 0.5)
	// does not zoom out past min
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[0] * 0.5)

	editor.setCameraOptions({
		...cameraOptions,
		constraints: {
			bounds: { x: 0, y: 0, w: vsb.w * 2, h: vsb.h * 4 },
			padding: { x: 0, y: 0 },
			origin: { x: 0.5, y: 0.5 },
			initialZoom: 'fit-y',
			baseZoom: 'fit-y',
			behavior: 'free',
		},
	})
	// And reset the zoom to its initial value
	editor.resetZoom()

	expect(editor.getInitialZoom()).toBe(0.25) // fitting the y axis
	// Starts at 1
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[4] * 0.25)
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[3] * 0.25)
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[2] * 0.25)
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[1] * 0.25)
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[0] * 0.25)
	// does not zoom out past min
	editor.zoomOut()
	expect(editor.getZoomLevel()).toBe(cameraOptions.zoomSteps[0] * 0.25)
})
