import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('viewport.pageToScreen', () => {
	it('converts correctly', () => {
		expect(editor.pageToScreen(0, 0)).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen(200, 200)).toMatchObject({
			x: 200,
			y: 200,
		})
		editor.setCamera(100, 100)
		expect(editor.pageToScreen(200, 200)).toMatchObject({
			x: 300,
			y: 300,
		})
	})
})
