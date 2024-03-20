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
	editor.camera.zoomOut()
	expect(editor.camera.getZoom()).toBe(ZOOMS[2])
	editor.camera.zoomOut()
	expect(editor.camera.getZoom()).toBe(ZOOMS[1])
	editor.camera.zoomOut()
	expect(editor.camera.getZoom()).toBe(ZOOMS[0])
	// does not zoom out past min
	editor.camera.zoomOut()
	expect(editor.camera.getZoom()).toBe(ZOOMS[0])
})

it('does not zoom out when camera is frozen', () => {
	editor.camera.set({ x: 0, y: 0, z: 1 })
	expect(editor.camera.get()).toMatchObject({ x: 0, y: 0, z: 1 })
	editor.updateInstanceState({ canMoveCamera: false })
	editor.camera.zoomOut()
	expect(editor.camera.get()).toMatchObject({ x: 0, y: 0, z: 1 })
})
