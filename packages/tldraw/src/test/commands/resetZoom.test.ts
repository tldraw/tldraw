import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('When resetting zoom', () => {
	it('Resets the zoom when zoomed out', () => {
		const center = editor.getViewportScreenBounds().center.clone()
		editor.zoomOut()
		editor.resetZoom()
		expect(editor.getZoomLevel()).toBe(1)
		editor.zoomIn()
		editor.resetZoom()
		expect(editor.getZoomLevel()).toBe(1)
		expect(editor.getViewportScreenBounds().center.clone()).toMatchObject(center)
	})

	it('Resets the zoom when zoomed in', () => {
		const center = editor.getViewportScreenBounds().center.clone()
		editor.zoomOut()
		editor.resetZoom()
		expect(editor.getViewportScreenBounds().center.clone()).toMatchObject(center)
		editor.zoomIn()
		editor.resetZoom()
		expect(editor.getViewportScreenBounds().center.clone()).toMatchObject(center)
	})
})
