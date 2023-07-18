import { TestEditor, createDefaultShapes } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
})

it('converts correctly', () => {
	editor.zoomToFit()
	expect({ ...editor.camera, id: 'static' }).toMatchSnapshot('Zoom to Fit Camera')
})

it('does not zoom to bounds when camera is frozen', () => {
	const cameraBefore = { ...editor.camera }
	editor.updateInstanceState({ canMoveCamera: false })
	editor.zoomToFit()
	expect(editor.camera).toMatchObject(cameraBefore)
})
