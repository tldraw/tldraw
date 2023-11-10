import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('Sets the brush', () => {
	expect(editor.getInstanceState().brush).toEqual(null)

	editor.updateInstanceState({ brush: { x: 0, y: 0, w: 100, h: 100 } })

	expect(editor.getInstanceState().brush).toMatchObject({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})

	editor.undo()

	expect(editor.getInstanceState().brush).toEqual({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})

	editor.redo()

	expect(editor.getInstanceState().brush).toEqual({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})
})
