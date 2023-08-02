import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.setCamera({ x: 0, y: 0, z: 1 })
})

describe('viewport.pageToScreen', () => {
	it('converts correctly', () => {
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({
			x: 200,
			y: 200,
		})
		editor.setCamera({ x: 100, y: 100 })
		expect(editor.pageToScreen({ x: 200, y: 200 })).toMatchObject({
			x: 300,
			y: 300,
		})
	})

	// see `screen to page` for paired tests
})
