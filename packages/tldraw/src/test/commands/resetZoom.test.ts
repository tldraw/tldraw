import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('When resetting zoom', () => {
	it('Resets the zoom when zoomed out', () => {
		const center = editor.getViewportScreenBounds().center.clone()
		editor.camera.zoomOut()
		editor.camera.resetZoom()
		expect(editor.camera.getZoom()).toBe(1)
		editor.camera.zoomIn()
		editor.camera.resetZoom()
		expect(editor.camera.getZoom()).toBe(1)
		expect(editor.getViewportScreenBounds().center.clone()).toMatchObject(center)
	})

	it('Resets the zoom when zoomed in', () => {
		const center = editor.getViewportScreenBounds().center.clone()
		editor.camera.zoomOut()
		editor.camera.resetZoom()
		expect(editor.getViewportScreenBounds().center.clone()).toMatchObject(center)
		editor.camera.zoomIn()
		editor.camera.resetZoom()
		expect(editor.getViewportScreenBounds().center.clone()).toMatchObject(center)
	})
})
