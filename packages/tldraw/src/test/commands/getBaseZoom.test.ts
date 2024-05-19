import { TLCameraOptions } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('getBaseZoom', () => {
	it('gets initial zoom with default options', () => {
		expect(editor.getBaseZoom()).toBe(1)
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

		expect(editor.getBaseZoom()).toBe(1)

		cameraOptions = editor.getCameraOptions()
		editor.setCameraOptions({
			...cameraOptions,
			constraints: {
				...(cameraOptions.constraints as any),
				baseZoom: 'fit-x',
			},
		})

		expect(editor.getBaseZoom()).toBe(0.5)

		cameraOptions = editor.getCameraOptions()
		editor.setCameraOptions({
			...cameraOptions,
			constraints: {
				...(cameraOptions.constraints as any),
				baseZoom: 'fit-y',
			},
		})

		expect(editor.getBaseZoom()).toBe(0.25)

		cameraOptions = editor.getCameraOptions()
		editor.setCameraOptions({
			...cameraOptions,
			constraints: {
				...(cameraOptions.constraints as any),
				baseZoom: 'fit-min',
			},
		})

		expect(editor.getBaseZoom()).toBe(0.5)

		cameraOptions = editor.getCameraOptions()
		editor.setCameraOptions({
			...cameraOptions,
			constraints: {
				...(cameraOptions.constraints as any),
				baseZoom: 'fit-max',
			},
		})

		expect(editor.getBaseZoom()).toBe(0.25)

		cameraOptions = editor.getCameraOptions()
		editor.setCameraOptions({
			...cameraOptions,
			constraints: {
				...(cameraOptions.constraints as any),
				baseZoom: 'default',
			},
		})

		expect(editor.getBaseZoom()).toBe(1)
	})
})
