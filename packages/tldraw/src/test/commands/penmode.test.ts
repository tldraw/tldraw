import { Vec } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('ignores touch events while in pen mode', async () => {
	editor.setCurrentTool('draw')
	editor.updateInstanceState({ isPenMode: true })
	editor.dispatch({
		type: 'pointer',
		name: 'pointer_down',
		isPen: false,
		pointerId: 1,
		point: new Vec(100, 100),
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		accelKey: false,
		button: 1,
		target: 'canvas',
	})

	expect(editor.getCurrentPageShapes().length).toBe(0)
})

it('should allow pen input to create shapes when pen mode is on', async () => {
	editor.setCurrentTool('draw')
	editor.updateInstanceState({ isPenMode: true })

	// Pen input should work
	editor.dispatch({
		type: 'pointer',
		name: 'pointer_down',
		isPen: true,
		pointerId: 1,
		point: new Vec(100, 100),
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		accelKey: false,
		button: 0,
		target: 'canvas',
	})

	editor.dispatch({
		type: 'pointer',
		name: 'pointer_move',
		isPen: true,
		pointerId: 1,
		point: new Vec(200, 200),
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		accelKey: false,
		button: 0,
		target: 'canvas',
	})

	editor.dispatch({
		type: 'pointer',
		name: 'pointer_up',
		isPen: true,
		pointerId: 1,
		point: new Vec(200, 200),
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		accelKey: false,
		button: 0,
		target: 'canvas',
	})

	expect(editor.getCurrentPageShapes().length).toBe(1)
})
