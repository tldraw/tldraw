import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('Sets the brush', () => {
	expect(editor.instanceState.brush).toEqual(null)

	editor.updateInstanceState({ brush: { x: 0, y: 0, w: 100, h: 100 } })

	expect(editor.instanceState.brush).toMatchObject({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})

	editor.undo()

	expect(editor.instanceState.brush).toEqual({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})

	editor.redo()

	expect(editor.instanceState.brush).toEqual({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})
})
