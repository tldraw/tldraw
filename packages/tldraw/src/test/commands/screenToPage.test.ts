import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('viewport.screenToPage', () => {
	it('converts correctly', () => {
		expect(editor.screenToPage(0, 0)).toMatchObject({ x: 0, y: 0 })
		expect(editor.screenToPage(200, 200)).toMatchObject({
			x: 200,
			y: 200,
		})
		editor.setCamera(100, 100)
		expect(editor.screenToPage(200, 200)).toMatchObject({
			x: 100,
			y: 100,
		})
	})
})
