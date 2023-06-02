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
	editor.zoomOut()
	expect(editor.zoomLevel).toBe(ZOOMS[2])
	editor.zoomOut()
	expect(editor.zoomLevel).toBe(ZOOMS[1])
	editor.zoomOut()
	expect(editor.zoomLevel).toBe(ZOOMS[0])
	// does not zoom out past min
	editor.zoomOut()
	expect(editor.zoomLevel).toBe(ZOOMS[0])
})

it('does not zoom out when camera is frozen', () => {
	editor.setCamera(0, 0, 1)
	expect(editor.camera).toMatchObject({ x: 0, y: 0, z: 1 })
	editor.canMoveCamera = false
	editor.zoomOut()
	expect(editor.camera).toMatchObject({ x: 0, y: 0, z: 1 })
})
