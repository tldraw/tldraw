import { ZOOMS } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('zooms by increments', () => {
	// Starts at 1
	expect(editor.camera.getZoom()).toBe(1)
	expect(editor.camera.getZoom()).toBe(ZOOMS[3])
	// zooms in
	expect(editor.camera.getZoom()).toBe(ZOOMS[3])
	editor.camera.zoomIn()
	expect(editor.camera.getZoom()).toBe(ZOOMS[4])
	editor.camera.zoomIn()
	expect(editor.camera.getZoom()).toBe(ZOOMS[5])
	editor.camera.zoomIn()
	expect(editor.camera.getZoom()).toBe(ZOOMS[6])

	// does not zoom in past max
	editor.camera.zoomIn()
	expect(editor.camera.getZoom()).toBe(ZOOMS[6])
})

it('preserves the screen center', () => {
	const viewportCenter = editor.getViewportPageCenter().toJson()
	const screenCenter = editor.getViewportScreenCenter().toJson()

	editor.camera.zoomIn()

	expect(editor.getViewportPageCenter().toJson()).toCloselyMatchObject(viewportCenter)
	expect(editor.getViewportScreenCenter().toJson()).toCloselyMatchObject(screenCenter)
})

it('preserves the screen center when offset', () => {
	editor.setScreenBounds({ x: 100, y: 100, w: 1000, h: 1000 })

	const viewportCenter = editor.getViewportPageCenter().toJson()
	const screenCenter = editor.getViewportScreenCenter().toJson()

	editor.camera.zoomIn()

	expect(editor.getViewportPageCenter().toJson()).toCloselyMatchObject(viewportCenter)
	expect(editor.getViewportScreenCenter().toJson()).toCloselyMatchObject(screenCenter)
})

it('zooms to from B to D when B >= (C - A)/2, else zooms from B to C', () => {
	editor.camera.set({ x: 0, y: 0, z: (ZOOMS[2] + ZOOMS[3]) / 2 })
	editor.camera.zoomIn()
	expect(editor.camera.getZoom()).toBe(ZOOMS[4])
	editor.camera.set({ x: 0, y: 0, z: (ZOOMS[2] + ZOOMS[3]) / 2 - 0.1 })
	editor.camera.zoomIn()
	expect(editor.camera.getZoom()).toBe(ZOOMS[3])
})

it('does not zoom when camera is frozen', () => {
	editor.camera.set({ x: 0, y: 0, z: 1 })
	expect(editor.camera.get()).toMatchObject({ x: 0, y: 0, z: 1 })
	editor.updateInstanceState({ canMoveCamera: false })
	editor.camera.zoomIn()
	expect(editor.camera.get()).toMatchObject({ x: 0, y: 0, z: 1 })
})
