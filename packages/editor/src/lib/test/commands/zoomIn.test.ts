import { ZOOMS } from '../../constants'
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
	editor.setCamera(0, 0, (ZOOMS[2] + ZOOMS[3]) / 2)
	editor.zoomIn()
	expect(editor.zoomLevel).toBe(ZOOMS[4])
	editor.setCamera(0, 0, (ZOOMS[2] + ZOOMS[3]) / 2 - 0.1)
	editor.zoomIn()
	expect(editor.zoomLevel).toBe(ZOOMS[3])
})

it('does not zoom when camera is frozen', () => {
	editor.setCamera(0, 0, 1)
	expect(editor.camera).toMatchObject({ x: 0, y: 0, z: 1 })
	editor.canMoveCamera = false
	editor.zoomIn()
	expect(editor.camera).toMatchObject({ x: 0, y: 0, z: 1 })
})
