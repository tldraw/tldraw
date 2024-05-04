import { DEFAULT_CAMERA_OPTIONS, Vec } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
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

describe('With default options', () => {
	beforeEach(() => {
		editor.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS })
	})

	it.todo('pans')
	it.todo('zooms in')
	it.todo('zooms out')
	it.todo('resets zoom')
	it.todo('pans with wheel')
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
				delta: new Vec(0, 0, 0.01),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ z: 1.01 })
		editor
			.dispatch({
				...wheelEvent,
				delta: new Vec(0, 0, -0.01),
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
				delta: new Vec(5, 10),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 2 }) // 1 + 1
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
				delta: new Vec(5, 10),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 3 }) // 1 + (1 * 2)
	})

	it('Effects wheel zooming (.5x)', () => {
		editor
			.setCameraOptions({ ...DEFAULT_CAMERA_OPTIONS, zoomSpeed: 0.5, wheelBehavior: 'zoom' })
			.dispatch({
				...wheelEvent,
				delta: new Vec(5, 10),
			})
			.forceTick()
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1.5 }) // 1 + (1 * .5)
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
})
