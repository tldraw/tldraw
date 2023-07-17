import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('centers on the point', () => {
	editor.centerOnPoint(400, 400)
	expect(editor.viewportPageCenter).toMatchObject({ x: 400, y: 400 })
})
