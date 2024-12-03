import { Vec } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('Pen mode left click on mouse should draw', async () => {
	editor.setCurrentTool('draw')
	editor.updateInstanceState({ isPenMode: true })
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

	expect(editor.getCurrentPageShapes().length).toBe(1)
})

it('Touch events do not draw in pen mode', async () => {
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
		button: 0,
		target: 'canvas',
	})

	expect(editor.getCurrentPageShapes().length).toBe(0)
})

it('Touch events do not draw when pen mode is disabled', async () => {
	editor.setCurrentTool('draw')
	editor.updateInstanceState({ isPenMode: false })
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

it('Allows panning with finger in pen mode', () => {
	editor.updateInstanceState({ isPenMode: true })
	editor.pointerDown(0, 0, { isPen: false, button: 0 })
	editor.pointerMove(100, 100)
	editor.expectCameraToBe(100, 100, 1)
})

it('Ensure pen does not pan when drawing', () => {
	editor.updateInstanceState({ isPenMode: true })
	editor.pointerDown(0, 0, { isPen: true, button: 0 })
	editor.pointerMove(100, 100)
	editor.expectCameraToBe(0, 0, 1)
})
