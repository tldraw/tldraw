import { Vec2d } from '@tldraw/primitives'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('ignores touch events while in pen mode', async () => {
	editor.setSelectedTool('draw')
	editor.setPenMode(true)
	editor.dispatch({
		type: 'pointer',
		name: 'pointer_down',
		isPen: false,
		pointerId: 1,
		point: new Vec2d(100, 100),
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		button: 1,
		target: 'canvas',
	})

	expect(editor.shapesArray.length).toBe(0)
})
