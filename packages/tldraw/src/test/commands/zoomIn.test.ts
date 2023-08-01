import { ZOOMS } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('zooms by increments', () => {
	// Starts at 1
	expect(editor.zoomLevel).toBe(1)
	expect(editor.zoomLevel).toBe(ZOOMS[3])
	// zooms in
	expect(editor.zoomLevel).toBe(ZOOMS[3])
	editor.zoomIn()
	expect(editor.zoomLevel).toBe(ZOOMS[4])
	editor.zoomIn()
	expect(editor.zoomLevel).toBe(ZOOMS[5])
	editor.zoomIn()
	expect(editor.zoomLevel).toBe(ZOOMS[6])

	// does not zoom in past max
	editor.zoomIn()
	expect(editor.zoomLevel).toBe(ZOOMS[6])
})

it('zooms to from B to D when B >= (C - A)/2, else zooms from B to C', () => {
	editor.setCamera({ x: 0, y: 0, z: (ZOOMS[2] + ZOOMS[3]) / 2 })
	editor.zoomIn()
	expect(editor.zoomLevel).toBe(ZOOMS[4])
	editor.setCamera({ x: 0, y: 0, z: (ZOOMS[2] + ZOOMS[3]) / 2 - 0.1 })
	editor.zoomIn()
	expect(editor.zoomLevel).toBe(ZOOMS[3])
})

it('does not zoom when camera is frozen', () => {
	editor.setCamera({ x: 0, y: 0, z: 1 })
	expect(editor.camera).toMatchObject({ x: 0, y: 0, z: 1 })
	editor.updateInstanceState({ canMoveCamera: false })
	editor.zoomIn()
	expect(editor.camera).toMatchObject({ x: 0, y: 0, z: 1 })
})
