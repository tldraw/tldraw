import { TLCameraOptions } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('getInitialZoom', () => {
	it('gets initial zoom with default options', () => {
		expect(editor.getInitialZoom()).toBe(1)
	})

	it('gets initial zoom based on constraints', () => {
		const vsb = editor.getViewportScreenBounds()
		let cameraOptions: TLCameraOptions

		cameraOptions = editor.getCameraOptions()
		editor.setCameraOptions({
			...cameraOptions,
			constraints: {
				bounds: { x: 0, y: 0, w: vsb.w * 2, h: vsb.h * 4 },
				padding: { x: 0, y: 0 },
				origin: { x: 0.5, y: 0.5 },
				initialZoom: 'default',
				baseZoom: 'default',
				behavior: 'free',
			},
		})

		expect(editor.getInitialZoom()).toBe(1)

		cameraOptions = editor.getCameraOptions()
		editor.setCameraOptions({
			...cameraOptions,
			constraints: {
				...(cameraOptions.constraints as any),
				initialZoom: 'fit-x',
			},
		})

		expect(editor.getInitialZoom()).toBe(0.5)

		cameraOptions = editor.getCameraOptions()
		editor.setCameraOptions({
			...cameraOptions,
			constraints: {
				...(cameraOptions.constraints as any),
				initialZoom: 'fit-y',
			},
		})

		expect(editor.getInitialZoom()).toBe(0.25)

		cameraOptions = editor.getCameraOptions()
		editor.setCameraOptions({
			...cameraOptions,
			constraints: {
				...(cameraOptions.constraints as any),
				initialZoom: 'fit-min',
			},
		})

		expect(editor.getInitialZoom()).toBe(0.5)

		cameraOptions = editor.getCameraOptions()
		editor.setCameraOptions({
			...cameraOptions,
			constraints: {
				...(cameraOptions.constraints as any),
				initialZoom: 'fit-max',
			},
		})

		expect(editor.getInitialZoom()).toBe(0.25)

		cameraOptions = editor.getCameraOptions()
		editor.setCameraOptions({
			...cameraOptions,
			constraints: {
				...(cameraOptions.constraints as any),
				initialZoom: 'default',
			},
		})

		expect(editor.getInitialZoom()).toBe(1)
	})
})
