import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('Sets the brush', () => {
	expect(editor.brush).toEqual(null)

	editor.setBrush({ x: 0, y: 0, w: 100, h: 100 })

	expect(editor.brush).toMatchObject({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})

	editor.undo()

	expect(editor.brush).toEqual({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})

	editor.redo()

	expect(editor.brush).toEqual({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})
})
