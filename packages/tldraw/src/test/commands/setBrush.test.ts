import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('Sets the brush', () => {
	expect(editor.instanceState.getBrush()).toEqual(null)

	editor.instanceState.update({ brush: { x: 0, y: 0, w: 100, h: 100 } })

	expect(editor.instanceState.getBrush()).toMatchObject({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})

	editor.undo()

	expect(editor.instanceState.getBrush()).toEqual({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})

	editor.redo()

	expect(editor.instanceState.getBrush()).toEqual({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})
})
