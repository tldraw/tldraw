import { Box, DEFAULT_CAMERA_OPTIONS, Vec, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({
		options: {
			edgeScrollDelay: 0,
			edgeScrollEaseDuration: 0,
		},
	})
	editor.updateViewportScreenBounds(new Box(0, 0, 1600, 900))
	editor.user.updateUserPreferences({ inputMode: null })
})

const wheelEvent = {
	type: 'wheel',
	name: 'wheel',
	delta: new Vec(0, 0, 0),
	point: new Vec(0, 0),
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	accelKey: false,
} as const

const pinchEvent = {
	type: 'pinch',
	name: 'pinch',
	delta: new Vec(0, 0, 1),
	point: new Vec(0, 0),
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	accelKey: false,
} as const

const keyBoardEvent = {
	type: 'keyboard',
	name: 'key_down',
	key: ' ',
	code: 'Space',
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	accelKey: false,
} as const

describe('With default options', () => {
	beforeEach(() => {
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS })
	})
	it('pans', () => {
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor
			.dispatch({
				...pinchEvent,
				name: 'pinch_start',
			})
			.forceTick()
		editor
			.dispatch({
				...pinchEvent,
				name: 'pinch',
				delta: new Vec(100, -10),
			})
			.forceTick()
		editor
			.dispatch({
				...pinchEvent,
				name: 'pinch_end',
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 100, y: -10, z: 1 })
	})
	it('pans with wheel', () => {
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor.dispatch({ ...wheelEvent, delta: new Vec(5, 10) }).forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 5, y: 10, z: 1 })
	})
	it('zooms with wheel', () => {
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		// zoom in 10%
		editor.dispatch({ ...wheelEvent, delta: new Vec(0, 0, -0.1), ctrlKey: true }).forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 0.9 })
		// zoom out 10%
		editor.dispatch({ ...wheelEvent, delta: new Vec(0, 0, 0.1), ctrlKey: true }).forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 0.99 })
	})
	it('pinch zooms', () => {
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		// zoom in
		editor
			.dispatch({
				...pinchEvent,
				name: 'pinch_start',
			})
			.forceTick()
		editor
			.dispatch({
				...pinchEvent,
				name: 'pinch',
				point: new Vec(0, 0, 0.5),
			})
			.forceTick()
		editor
			.dispatch({
				...pinchEvent,
				name: 'pinch_end',
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 0.5 })
		// zoom out
		editor
			.dispatch({
				...pinchEvent,
				name: 'pinch_start',
			})
			.forceTick()
		editor
			.dispatch({
				...pinchEvent,
				name: 'pinch',
				point: new Vec(0, 0, 1),
			})
			.forceTick()
		editor
			.dispatch({
				...pinchEvent,
				name: 'pinch_end',
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	})
})

it('Sets the camera options', () => {
	const optionsA = { ...DEFAULT_CAMERA_OPTIONS, panSpeed: 2 }
	editor.setCameraOptions(optionsA)
	expect(editor.getCameraOptions()).toMatchObject(optionsA)
})

describe('CameraOptions.wheelBehavior', () => {
	it('Pans when wheel behavior is pan', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, wheelBehavior: 'pan' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(5, 10),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 5, y: 10, z: 1 })
	})

	it('Zooms when wheel behavior is zoom', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, wheelBehavior: 'zoom' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 0, 0),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ z: 1 })
		editor
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 1, 0),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ z: 1.01 })
		editor
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, -1, 0),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ z: 0.9999 }) // zooming is non-linear
	})

	it('When wheelBehavior is pan, ctrl key zooms', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, wheelBehavior: 'pan' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 5, 0.01),
				ctrlKey: true, // zooms
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ z: 1.01 })
	})

	it('When wheelBehavior is zoom, ctrl key pans', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, wheelBehavior: 'zoom' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 5, 0.01),
				ctrlKey: true, // zooms
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 5, z: 1 })
	})

	it('When input mode is set, camera wheel behavior is ignored', () => {
		editor.user.updateUserPreferences({ inputMode: 'trackpad' })
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, wheelBehavior: 'zoom' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 5, 0.01),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 5, z: 1 })
	})
})

describe('CameraOptions.panSpeed', () => {
	it('Affects wheel panning (2x)', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, panSpeed: 2, wheelBehavior: 'pan' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(5, 10),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 10, y: 20, z: 1 })
	})

	it('Affects wheel panning (.5x)', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, panSpeed: 0.5, wheelBehavior: 'pan' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(5, 10),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 2.5, y: 5, z: 1 })
	})

	it('Does not affect zoom mouse wheeling', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, panSpeed: 2, wheelBehavior: 'zoom' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 1, 0),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1.01 }) // 1 + 1
	})

	it('Does not affect hand tool panning', () => {
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, panSpeed: 2 })
		editor.setCurrentTool('hand').pointerDown(0, 0).pointerMove(5, 10).forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 5, y: 10, z: 1 })
	})

	it('Does not affect spacebar panning (2x)', () => {
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, panSpeed: 2 })
		editor
			.dispatch({ ...keyBoardEvent, key: ' ', code: 'Space' })
			.pointerDown(0, 0)
			.pointerMove(5, 10)
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 5, y: 10, z: 1 })
	})

	it('Does not affect spacebar panning (0.5x)', () => {
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, panSpeed: 0.5 })
		editor
			.dispatch({ ...keyBoardEvent, key: ' ', code: 'Space' })
			.pointerDown(0, 0)
			.pointerMove(5, 10)
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 5, y: 10, z: 1 })
	})

	it('Does not affect edge scroll panning', () => {
		const shapeId = createShapeId()
		const viewportScreenBounds = editor.getViewportScreenBounds()
		editor.user.updateUserPreferences({ edgeScrollSpeed: 1 })
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, panSpeed: 2 })
			.createShape({ id: shapeId, type: 'geo', x: 10, y: 10 })
			.select(shapeId)
		const shape = editor.getSelectedShapes()[0]
		editor.selectNone()
		// Move shape far beyond bounds to trigger edge scrolling at maximum speed
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor.pointerDown(shape.x, shape.y).pointerMove(-5000, -5000)
		// At maximum speed and a zoom level of 1, the camera should move by 40px per tick if the screen
		// is wider than 1000 pixels, or by 40 * 0.612px if it is smaller.
		const newX = viewportScreenBounds.w < 1000 ? 25 * 0.612 : 25
		const newY = viewportScreenBounds.h < 1000 ? 25 * 0.612 : 25
		expect(editor.getCamera()).toMatchObject({ x: newX, y: newY, z: 1 })
	})
})

describe('CameraOptions.zoomSpeed', () => {
	it('Affects wheel zooming (2x)', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 2, wheelBehavior: 'zoom' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 1, 0),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1.02 }) // 1 + (.01 * 2)
	})

	it('Affects wheel zooming (.5x)', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 0.5, wheelBehavior: 'zoom' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 1, 0),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1.005 }) // 1 + (.01 * .5)
	})

	it('Does not affect mouse wheel panning', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 0.5, wheelBehavior: 'pan' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(5, 10),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 5, y: 10, z: 1 })
	})

	it('Does not affect pinch zooming (2x)', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 2 })
			.dispatch({
				...pinchEvent,
				name: 'pinch_start',
			})
			.forceTick()
		editor.dispatch({
			...pinchEvent,
			name: 'pinch',
			delta: new Vec(0, 0, 1),
		})
		editor.forceTick()
		editor.dispatch({
			...pinchEvent,
			name: 'pinch_end',
		})
		editor.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	})
	it('Does not affect pinch zooming (0.5x)', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 0.5 })
			.dispatch({
				...pinchEvent,
				name: 'pinch_start',
			})
			.forceTick()
		editor.dispatch({
			...pinchEvent,
			name: 'pinch',
			delta: new Vec(0, 0, 1),
		})
		editor.forceTick()
		editor.dispatch({
			...pinchEvent,
			name: 'pinch_end',
		})
		editor.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	})
	it('Does not affect zoom tool zooming (2x)', () => {
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 2 })
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor.setCurrentTool('zoom').click()
		vi.advanceTimersByTime(300)
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 2 })
	})
	it('Does not affect zoom tool zooming (0.5x)', () => {
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 0.5 })
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor.setCurrentTool('zoom').click()
		vi.advanceTimersByTime(300)
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 2 })
	})
	it('Does not affect editor zoom method (2x)', () => {
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 2 })
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor.zoomIn(new Vec(0, 0), { immediate: true })
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 2 })
		editor.zoomOut(new Vec(0, 0), { immediate: true })
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	})
	it('Does not affect editor zoom method (0.5x)', () => {
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 0.5 })
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor.zoomIn(new Vec(0, 0), { immediate: true })
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 2 })
		editor.zoomOut(new Vec(0, 0), { immediate: true })
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	})
})

describe('CameraOptions.isLocked', () => {
	it('Pans when unlocked', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, isLocked: false })
			.dispatch({
				...wheelEvent,
				delta: new Vec(5, 10),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 5, y: 10, z: 1 })
		editor.pan(new Vec(10, 10))
		expect(editor.getCamera()).toMatchObject({ x: 15, y: 20, z: 1 })
	})

	it('Does not pan when locked', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, isLocked: true })
			.dispatch({
				...wheelEvent,
				delta: new Vec(5, 10),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor.pan(new Vec(10, 10))
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	})

	it('Zooms when unlocked', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, isLocked: false })
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 0, 0.01),
				ctrlKey: true,
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ z: 1.01 })
		editor.zoomIn(undefined, { immediate: true })
		expect(editor.getCamera()).toMatchObject({ z: 2 })
	})

	it('Does not zoom when locked', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, isLocked: true })
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 0, 0.01),
				ctrlKey: true,
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ z: 1 })
		editor.zoomIn(undefined, { immediate: true })
		expect(editor.getCamera()).toMatchObject({ z: 1 })
	})
})

// zoom steps are tested in zoom in / zoom out method

describe('CameraOptions.zoomSteps', () => {
	it('Does not zoom past max zoom step', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSteps: [0.5, 1, 2] })
			.setCamera(new Vec(0, 0, 100), { immediate: true })
		expect(editor.getZoomLevel()).toBe(2)
		editor.zoomIn(undefined, { immediate: true })
		expect(editor.getZoomLevel()).toBe(2)
	})

	it('Does not zoom below min zoom step', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSteps: [0.5, 1, 2] })
			.setCamera(new Vec(0, 0, 0), { immediate: true })
		expect(editor.getZoomLevel()).toBe(0.5)
		editor.zoomOut(undefined, { immediate: true })
		expect(editor.getZoomLevel()).toBe(0.5)
	})

	it('Zooms between zoom steps', () => {
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSteps: [0.5, 1, 2] })
		expect(editor.getZoomLevel()).toBe(1)
		editor.zoomIn(undefined, { immediate: true })
		expect(editor.getZoomLevel()).toBe(2)
		editor.zoomOut(undefined, { immediate: true })
		expect(editor.getZoomLevel()).toBe(1)
		editor.zoomOut(undefined, { immediate: true })
		expect(editor.getZoomLevel()).toBe(0.5)
		editor.zoomIn(undefined, { immediate: true })
		expect(editor.getZoomLevel()).toBe(1)
	})
})

// constraints?: {
// 	/** The bounds (in page space) of the constrained space */
// 	bounds: BoxModel
// 	/** The padding inside of the viewport (in screen space) */
// 	padding: VecLike
// 	/** The origin for placement. Used to position the bounds within the viewport when an axis is fixed or contained and zoom is below the axis fit. */
// 	origin: VecLike
// 	/** The camera's initial zoom, used also when the camera is reset. */
// 	initialZoom: 'fit-min' | 'fit-max' | 'fit-x' | 'fit-y' | 'default'
// 	/** The camera's base for its zoom steps. */
// 	baseZoom: 'fit-min' | 'fit-max' | 'fit-x' | 'fit-y' | 'default'
// 	/** The behavior for the constraints on the x axis. */
// 	behavior:
// 		| 'free'
// 		| 'contain'
// 		| 'inside'
// 		| 'outside'
// 		| 'fixed'
// 		| {
// 				x: 'contain' | 'inside' | 'outside' | 'fixed' | 'free'
// 				y: 'contain' | 'inside' | 'outside' | 'fixed' | 'free'
// 			}
// }

const DEFAULT_CONSTRAINTS = {
	bounds: { x: 0, y: 0, w: 1200, h: 800 },
	padding: { x: 0, y: 0 },
	origin: { x: 0.5, y: 0.5 },
	initialZoom: 'default',
	baseZoom: 'default',
	behavior: 'free',
} as const

describe('When constraints are free', () => {
	beforeEach(() => {
		editor.updateViewportScreenBounds(new Box(0, 0, 1600, 900))
		editor.setCameraOptions({
			...DEFAULT_CAMERA_OPTIONS,
			constraints: {
				...DEFAULT_CONSTRAINTS,
				behavior: 'free',
			},
		})
	})

	it('starts at 1 zoom', () => {
		expect(editor.getZoomLevel()).toBe(1)
	})

	it('pans freely', () => {
		editor.pan(new Vec(100, 100))
		expect(editor.getCamera()).toMatchObject({ x: 100, y: 100, z: 1 })
		editor.pan(new Vec(5000, 5000))
		expect(editor.getCamera()).toMatchObject({ x: 5100, y: 5100, z: 1 })
	})

	it('zooms onto mouse position', () => {
		editor.pointerMove(100, 100)
		expect(editor.inputs.currentPagePoint).toMatchObject({ x: 100, y: 100 })
		editor.zoomIn(editor.inputs.currentScreenPoint, { immediate: true })
		expect(editor.inputs.currentPagePoint).toMatchObject({ x: 100, y: 100 })
		editor.zoomOut(editor.inputs.currentScreenPoint, { immediate: true })
		expect(editor.inputs.currentPagePoint).toMatchObject({ x: 100, y: 100 })
	})
})

describe('When constraints are contain', () => {
	beforeEach(() => {
		editor.setCameraOptions({
			...DEFAULT_CAMERA_OPTIONS,
			constraints: {
				...DEFAULT_CONSTRAINTS,
				behavior: 'contain',
			},
		})
	})

	it('resets zoom to 1', () => {
		editor.zoomIn(undefined, { immediate: true })
		editor.zoomIn(undefined, { immediate: true })
		editor.resetZoom()
		expect(editor.getZoomLevel()).toBe(1)
	})

	it('does not pan when below the fit zoom', () => {
		editor.pan(new Vec(100, 100))
		expect(editor.getCamera()).toMatchObject({ x: 200, y: 50, z: 1 })
		editor.pan(new Vec(5000, 5000))
		expect(editor.getCamera()).toMatchObject({ x: 200, y: 50, z: 1 })
	})
})

describe('Zoom reset positions based on origin', () => {
	it('Default .5, .5 origin', () => {
		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					initialZoom: 'default',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		expect(editor.getCamera()).toMatchObject({ x: 200, y: 50, z: 1 })
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 200, y: 50, z: 1 })
	})

	it('0 0 origin', () => {
		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0, y: 0 },
					initialZoom: 'default',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	})

	it('1 1 origin', () => {
		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 1, y: 1 },
					initialZoom: 'default',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		expect(editor.getCamera()).toMatchObject({ x: 400, y: 100, z: 1 })
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 400, y: 100, z: 1 })
	})
})

describe('CameraOptions.constraints.initialZoom + behavior', () => {
	it('When fit is default', () => {
		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					initialZoom: 'default',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		expect(editor.getCamera()).toMatchObject({ x: 200, y: 50, z: 1 })
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 200, y: 50, z: 1 })
	})

	it('When fit is fit-max', () => {
		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					initialZoom: 'fit-max',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		// y should be 0 because the viewport width is bigger than the height
		expect(editor.getCamera()).toCloselyMatchObject({ x: 111.11, y: 0, z: 1.125 }, 2)
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toCloselyMatchObject({ x: 111.11, y: 0, z: 1.125 }, 2)

		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					bounds: { x: 0, y: 0, w: 800, h: 1200 },
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					initialZoom: 'fit-max',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		// y should be 0 because the viewport width is bigger than the height
		expect(editor.getCamera()).toCloselyMatchObject({ x: 666.66, y: 0, z: 0.75 }, 2)
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toCloselyMatchObject({ x: 666.66, y: 0, z: 0.75 }, 2)

		// The proportions of the bounds don't matter, it's the proportion of the viewport that decides which axis gets fit
		editor.updateViewportScreenBounds(new Box(0, 0, 900, 1600))
		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					initialZoom: 'fit-max',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		expect(editor.getCamera()).toCloselyMatchObject({ x: 0, y: 666.66, z: 0.75 }, 2)
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toCloselyMatchObject({ x: 0, y: 666.66, z: 0.75 }, 2)
	})

	it('When fit is fit-min', () => {
		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					initialZoom: 'fit-min',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		// x should be 0 because the viewport width is bigger than the height
		expect(editor.getCamera()).toCloselyMatchObject({ x: 0, y: -62.5, z: 1.333 }, 2)
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toCloselyMatchObject({ x: 0, y: -62.5, z: 1.333 }, 2)

		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					bounds: { x: 0, y: 0, w: 800, h: 1200 },
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					initialZoom: 'fit-min',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		// x should be 0 because the viewport width is bigger than the height
		expect(editor.getCamera()).toCloselyMatchObject({ x: 0, y: -375, z: 2 }, 2)
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toCloselyMatchObject({ x: 0, y: -375, z: 2 }, 2)

		// The proportions of the bounds don't matter, it's the proportion of the viewport that decides which axis gets fit
		editor.updateViewportScreenBounds(new Box(0, 0, 900, 1600))
		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					initialZoom: 'fit-min',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		expect(editor.getCamera()).toCloselyMatchObject({ x: -375, y: 0, z: 2 }, 2)
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toCloselyMatchObject({ x: -375, y: 0, z: 2 }, 2)
	})

	it('When fit is fit-min-100', () => {
		editor.updateViewportScreenBounds(new Box(0, 0, 1600, 900))

		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					initialZoom: 'fit-min-100',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		// Max 1 on initial / reset
		expect(editor.getCamera()).toCloselyMatchObject({ x: 200, y: 50, z: 1 }, 2)

		// Min is regular
		editor.updateViewportScreenBounds(new Box(0, 0, 800, 450))
		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					initialZoom: 'fit-min-100',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		expect(editor.getCamera()).toCloselyMatchObject({ x: 0, y: -62.5, z: 0.66 }, 2)
	})
})

describe('Padding', () => {
	it('sets when padding is zero', () => {
		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					padding: { x: 0, y: 0 },
					initialZoom: 'fit-max',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		// y should be 0 because the viewport width is bigger than the height
		expect(editor.getCamera()).toCloselyMatchObject({ x: 111.11, y: 0, z: 1.125 }, 2)
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toCloselyMatchObject({ x: 111.11, y: 0, z: 1.125 }, 2)
	})

	it('sets when padding is 100, 0', () => {
		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					padding: { x: 100, y: 0 },
					initialZoom: 'fit-max',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		// no change because the horizontal axis has extra space available
		expect(editor.getCamera()).toCloselyMatchObject({ x: 111.11, y: 0, z: 1.125 }, 2)
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toCloselyMatchObject({ x: 111.11, y: 0, z: 1.125 }, 2)

		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					padding: { x: 200, y: 0 },
					initialZoom: 'fit-max',
				},
			})
			.setCamera(editor.getCamera(), { reset: true })

		// now we're pinching
		expect(editor.getCamera()).toCloselyMatchObject({ x: 200, y: 50, z: 1 }, 2)
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toCloselyMatchObject({ x: 200, y: 50, z: 1 }, 2)
	})

	it('sets when padding is 0 x 100', () => {
		editor
			.setCameraOptions({
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					...DEFAULT_CONSTRAINTS,
					behavior: 'contain',
					origin: { x: 0.5, y: 0.5 },
					padding: { x: 0, y: 100 },
					initialZoom: 'fit-max',
				},
			})
			.setCamera(editor.getCamera(), { reset: true, immediate: true })

		// y should be 0 because the viewport width is bigger than the height
		expect(editor.getCamera()).toCloselyMatchObject({ x: 314.28, y: 114.28, z: 0.875 }, 2)
		editor.zoomIn().resetZoom().forceTick()
		expect(editor.getCamera()).toCloselyMatchObject({ x: 314.28, y: 114.28, z: 0.875 }, 2)
	})
})

describe('Contain behavior', () => {
	it('Locks axis until the bounds are smaller than the padded viewport, then allows "inside" panning', () => {
		const boundsW = 1600
		const boundsH = 900
		const padding = 100
		editor.setCameraOptions({
			...DEFAULT_CAMERA_OPTIONS,
			constraints: {
				...DEFAULT_CONSTRAINTS,
				bounds: { x: 0, y: 0, w: boundsW, h: boundsH },
				behavior: 'contain',
				origin: { x: 0.5, y: 0.5 },
				padding: { x: padding, y: padding },
				initialZoom: 'fit-max',
				baseZoom: 'fit-max',
			},
		})

		editor.setCamera(editor.getCamera(), { reset: true })

		const baseZoom = 700 / 900
		const x = padding / baseZoom - boundsW + (boundsW - padding * 2) / baseZoom - padding
		const y = padding / baseZoom - boundsH + (boundsH - padding * 2) / baseZoom
		expect(editor.getCamera()).toCloselyMatchObject({ x, y, z: baseZoom }, 5)
		// We should not be able to pan
		editor.pan(new Vec(-10000, -10000))
		expect(editor.getCamera()).toCloselyMatchObject({ x, y, z: baseZoom }, 5)
		// But we can zoom
		editor.zoomOut()
		const newZoom = 0.5 * baseZoom
		const newX =
			padding / newZoom - boundsW + (boundsW - padding * 2) / newZoom - boundsW / 2 - padding * 2
		const newY = padding / newZoom - boundsH + (boundsH - padding * 2) / newZoom - boundsH / 2
		const newCamera = { x: newX, y: newY, z: newZoom }
		expect(editor.getCamera()).toCloselyMatchObject(newCamera, 5)
		// Panning is still locked
		editor.pan(new Vec(-10000, -10000))
		expect(editor.getCamera()).toCloselyMatchObject(newCamera, 5)
		// Zooming to within bounds will allow us to pan
		editor.zoomIn().zoomIn()
		const camera = editor.getCamera()
		editor.pan(new Vec(-10000, -10000))
		expect(editor.getCamera()).not.toMatchObject(camera)
	})
})

describe('Inside behavior', () => {
	it('Allows panning that keeps the bounds inside of the padded viewport', () => {
		const bounds = editor.getViewportScreenBounds()
		// set the constraints to be inside the viewport + 100px padding
		editor.setCameraOptions({
			...DEFAULT_CAMERA_OPTIONS,
			constraints: {
				...DEFAULT_CONSTRAINTS,
				bounds: { x: 0, y: 0, w: bounds.w, h: bounds.h },
				behavior: 'inside',
				origin: { x: 0, y: 0 },
				padding: { x: 100, y: 100 },
				initialZoom: 'fit-min',
			},
		})
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		// panning far outside of the bounds
		editor.pan(new Vec(-10000, -10000))

		// should be clamped to the bounds + padding
		expect(editor.getCamera()).toMatchObject({ x: -100, y: -100, z: 1 })
		// panning to the opposite direction, far outside of the bounds
		editor.pan(new Vec(10000, 10000))

		// should be clamped to the bounds + padding
		expect(editor.getCamera()).toMatchObject({ x: 100, y: 100, z: 1 })
	})
})

describe('Outside behavior', () => {
	it('Allows panning that keeps the bounds adjacent to the padded viewport', () => {
		const bounds = editor.getViewportScreenBounds()
		// set the constraints to be the viewport + 100px padding
		editor.setCameraOptions({
			...DEFAULT_CAMERA_OPTIONS,
			constraints: {
				...DEFAULT_CONSTRAINTS,
				bounds: { x: 0, y: 0, w: bounds.w, h: bounds.h },
				behavior: 'outside',
				origin: { x: 0, y: 0 },
				padding: { x: 100, y: 100 },
				initialZoom: 'fit-min',
			},
		})
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		// panning far outside of the bounds
		editor.pan(new Vec(-10000, -10000))

		// should be clamped so that the far edge of the bounds is adjacent to the viewport + padding
		expect(editor.getCamera()).toMatchObject({ x: -bounds.w + 100, y: -bounds.h + 100, z: 1 })
		// panning to the opposite direction, far outside of the bounds
		editor.pan(new Vec(10000, 10000))

		// should be clamped so that the far edge of the bounds is adjacent to the viewport + padding
		expect(editor.getCamera()).toMatchObject({ x: bounds.w - 100, y: bounds.h - 100, z: 1 })
	})
})

describe('Allows mixed values for x and y', () => {
	it('Allows different values to be set for x and y behaviour', () => {
		editor.setCameraOptions({
			...DEFAULT_CAMERA_OPTIONS,
			constraints: {
				...DEFAULT_CONSTRAINTS,
				behavior: { x: 'inside', y: 'outside' },
				initialZoom: 'fit-x',
				baseZoom: 'fit-x',
			},
		})
		editor.setCamera(editor.getCamera(), { reset: true })
		const camera = editor.getCamera()
		editor.pan(new Vec(-100, 0))

		// no change when panning on x axis because it's set to inside
		expect(editor.getCamera()).toMatchObject(camera)
		editor.pan(new Vec(0, -100))

		// change when panning on y axis because it's set to outside
		expect(editor.getCamera()).toMatchObject({ ...camera, y: camera.y - 100 / camera.z })
		editor.pan(new Vec(0, -1000000))

		// clamped to the bounds
		expect(editor.getCamera()).toMatchObject({ ...camera, y: -800 })
	})
	it('Allows different values to be set for x and y origin', () => {
		editor.setCameraOptions({
			...DEFAULT_CAMERA_OPTIONS,
			constraints: {
				...DEFAULT_CONSTRAINTS,
				behavior: 'contain',
				origin: { x: 0, y: 1 },
				initialZoom: 'default',
			},
		})
		editor.setCamera(editor.getCamera(), { reset: true })
		const camera = editor.getCamera()
		editor.zoomOut()
		// zooms out and keeps the bounds in the bottom left of the viewport, so no change on x axis
		expect(editor.getCamera()).toMatchObject({ x: 0, y: camera.y + 900, z: 0.5 })
	})
})

test('it animated towards the constrained viewport rather than the given viewport', () => {
	// @ts-expect-error
	const mockAnimateToViewport = (editor._animateToViewport = vi.fn())
	editor.setCameraOptions({
		...DEFAULT_CAMERA_OPTIONS,
		constraints: {
			...DEFAULT_CONSTRAINTS,
			behavior: 'contain',
			origin: { x: 0.5, y: 0.5 },
			padding: { x: 100, y: 100 },
			initialZoom: 'fit-max',
		},
	})

	editor.setCamera(new Vec(-1000000, -1000000), { animation: { duration: 4000 } })
	expect(mockAnimateToViewport).toHaveBeenCalledTimes(1)
	expect(mockAnimateToViewport.mock.calls[0][0]).toMatchInlineSnapshot(`
		Box {
		  "h": 900,
		  "w": 1600,
		  "x": -200,
		  "y": -0,
		}
	`)
})

test('calling setCameraOptions will apply the new constraints', () => {
	editor.setCameraOptions({
		...DEFAULT_CAMERA_OPTIONS,
		constraints: {
			...DEFAULT_CONSTRAINTS,
		},
	})
	editor.setCamera(new Vec(-1000000, -1000000, 1))
	const camera = editor.getCamera()
	expect(camera).toMatchObject({ x: -1000000, y: -1000000, z: 1 })
	editor.setCameraOptions({
		...DEFAULT_CAMERA_OPTIONS,
		constraints: {
			...DEFAULT_CONSTRAINTS,
			bounds: { x: 0, y: 0, w: 1600, h: 900 },
			behavior: 'contain',
		},
	})
	expect(editor.getCamera()).toMatchInlineSnapshot(`
		{
		  "id": "camera:page:page",
		  "meta": {},
		  "typeName": "camera",
		  "x": 0,
		  "y": 0,
		  "z": 1,
		}
	`)
})
