import { Box, DEFAULT_CAMERA_OPTIONS, Vec } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.updateViewportScreenBounds(new Box(0, 0, 1600, 900))
})

const wheelEvent = {
	type: 'wheel',
	name: 'wheel',
	delta: new Vec(0, 0, 0),
	point: new Vec(0, 0),
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
} as const

const pinchEvent = {
	type: 'pinch',
	name: 'pinch',
	delta: new Vec(0, 0, 1),
	point: new Vec(0, 0),
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
} as const

describe('With default options', () => {
	beforeEach(() => {
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS })
	})
	it('pans', () => {
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor.dispatch({
			...pinchEvent,
			name: 'pinch_start',
		})
		editor.forceTick()
		editor.dispatch({
			...pinchEvent,
			name: 'pinch',
			delta: new Vec(100, -10),
		})
		editor.forceTick()
		editor.dispatch({
			...pinchEvent,
			name: 'pinch_end',
		})
		editor.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 100, y: -10, z: 1 })
	})
	it('pans with wheel', () => {
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		editor.dispatch({ ...wheelEvent, delta: new Vec(5, 10) })
		editor.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 5, y: 10, z: 1 })
	})
	it('zooms with wheel', () => {
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		// zoom in 10%
		editor.dispatch({ ...wheelEvent, delta: new Vec(0, 0, -0.1), ctrlKey: true })
		editor.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 0.9 })
		// zoom out 10%
		editor.dispatch({ ...wheelEvent, delta: new Vec(0, 0, 0.1), ctrlKey: true })
		editor.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 0.99 })
	})
	it('pinch zooms', () => {
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
		// zoom in
		editor.dispatch({
			...pinchEvent,
			name: 'pinch_start',
		})
		editor.forceTick()
		editor.dispatch({
			...pinchEvent,
			name: 'pinch',
			point: new Vec(0, 0, 0.5),
		})
		editor.forceTick()
		editor.dispatch({
			...pinchEvent,
			name: 'pinch_end',
		})
		editor.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 0.5 })
		// zoom out
		editor.dispatch({
			...pinchEvent,
			name: 'pinch_start',
		})
		editor.forceTick()
		editor.dispatch({
			...pinchEvent,
			name: 'pinch',
			point: new Vec(0, 0, 1),
		})
		editor.forceTick()
		editor.dispatch({
			...pinchEvent,
			name: 'pinch_end',
		})
		editor.forceTick()
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
})

describe('CameraOptions.panSpeed', () => {
	it('Effects wheel panning (2x)', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, panSpeed: 2, wheelBehavior: 'pan' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(5, 10),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 10, y: 20, z: 1 })
	})

	it('Effects wheel panning (.5x)', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, panSpeed: 0.5, wheelBehavior: 'pan' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(5, 10),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 2.5, y: 5, z: 1 })
	})

	it('Does not effect zoom mouse wheeling', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, panSpeed: 2, wheelBehavior: 'zoom' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 1, 0),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1.01 }) // 1 + 1
	})

	it.todo('hand tool panning')
	it.todo('spacebar panning')
	it.todo('edge scroll panning')
})

describe('CameraOptions.zoomSpeed', () => {
	it('Effects wheel zooming (2x)', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 2, wheelBehavior: 'zoom' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 1, 0),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1.02 }) // 1 + (.01 * 2)
	})

	it('Effects wheel zooming (.5x)', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 0.5, wheelBehavior: 'zoom' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 1, 0),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1.005 }) // 1 + (.01 * .5)
	})

	it('Does not effect mouse wheel panning', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 0.5, wheelBehavior: 'pan' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(5, 10),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 5, y: 10, z: 1 })
	})

	it.todo('zoom method')
	it.todo('zoom tool zooming')
	it.todo('pinch zooming')
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
	it.todo(
		'Locks axis until the bounds are bigger than the padded viewport, then allows "inside" panning'
	)
})

describe('Inside behavior', () => {
	it.todo('Allows panning that keeps the bounds inside of the padded viewport')
})

describe('Outside behavior', () => {
	it.todo('Allows panning that keeps the bounds adjacent to the padded viewport')
})

describe('Allows mixed values for x and y', () => {
	it.todo('Allows different values to be set for x and y axes')
})
