import { TLDrawShape, Vec } from '@tldraw/editor'
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

describe('auto-entering pen mode', () => {
	it('auto-enables pen mode for direct-display pen input', () => {
		expect(editor.getInstanceState().isPenMode).toBe(false)
		editor.pointerDown(100, 100, { isPen: true, isPenDirect: true })
		expect(editor.getInstanceState().isPenMode).toBe(true)
	})

	it('does not auto-enable pen mode for indirect pen input', () => {
		expect(editor.getInstanceState().isPenMode).toBe(false)
		// An indirect desktop tablet stylus (e.g. a Wacom Intuos) still reports as a pen, but should
		// not flip the editor into pen mode.
		editor.pointerDown(100, 100, { isPen: true, isPenDirect: false })
		expect(editor.getInstanceState().isPenMode).toBe(false)
	})

	it('still draws with indirect pen input without entering pen mode', () => {
		editor.setCurrentTool('draw')
		editor.pointerDown(100, 100, { isPen: true, isPenDirect: false })
		editor.pointerMove(110, 110, { isPen: true, isPenDirect: false })
		editor.pointerMove(120, 120, { isPen: true, isPenDirect: false })
		editor.pointerUp(120, 120, { isPen: true, isPenDirect: false })

		expect(editor.getInstanceState().isPenMode).toBe(false)
		expect(editor.getCurrentPageShapes().length).toBe(1)
	})

	it('ignores non-pen input once pen mode has been enabled', () => {
		editor.setCurrentTool('draw')
		// A direct-display pen enables pen mode.
		editor.pointerDown(300, 300, { isPen: true, isPenDirect: true })
		editor.pointerUp(300, 300, { isPen: true, isPenDirect: true })
		expect(editor.getInstanceState().isPenMode).toBe(true)

		const shapeCount = editor.getCurrentPageShapes().length

		// A subsequent touch (non-pen) is ignored while in pen mode.
		editor.pointerDown(100, 100, { isPen: false })
		editor.pointerMove(120, 120, { isPen: false })
		editor.pointerUp(120, 120, { isPen: false })
		expect(editor.getCurrentPageShapes().length).toBe(shapeCount)
	})
})

describe('forgiving palm touches when entering pen mode', () => {
	it('does not connect a palm touch to the stylus stroke', () => {
		editor.setCurrentTool('draw')
		expect(editor.getInstanceState().isPenMode).toBe(false)

		// A palm rests on the canvas first (not a pen, pen mode is still off)
		editor.pointerDown(100, 100, { isPen: false })
		editor.expectToBeIn('draw.drawing')

		// Then the stylus lands, which switches the editor into pen mode
		editor.pointerDown(300, 300, { isPen: true })
		expect(editor.getInstanceState().isPenMode).toBe(true)

		// The stylus draws its stroke
		editor.pointerMove(310, 310, { isPen: true })
		editor.pointerMove(320, 320, { isPen: true })
		editor.pointerUp(320, 320, { isPen: true })

		expect(editor.getCurrentPageShapes().length).toBe(1)
		const shape = editor.getCurrentPageShapes()[0] as TLDrawShape

		// The stroke should begin where the stylus landed, not at the palm point.
		const bounds = editor.getShapePageBounds(shape.id)!
		expect(bounds.minX).toBeGreaterThan(200)
		expect(bounds.minY).toBeGreaterThan(200)
	})

	it('forgives a palm touch that was already dragging before the stylus lands', () => {
		editor.setCurrentTool('draw')

		// A palm rests on the canvas and drags a little before the stylus arrives
		editor.pointerDown(100, 100, { isPen: false })
		editor.pointerMove(120, 120, { isPen: false })
		editor.pointerMove(140, 140, { isPen: false })
		editor.expectToBeIn('draw.drawing')

		// The stylus lands, switching into pen mode and forgiving the palm stroke
		editor.pointerDown(300, 300, { isPen: true })
		expect(editor.getInstanceState().isPenMode).toBe(true)

		editor.pointerMove(310, 310, { isPen: true })
		editor.pointerMove(320, 320, { isPen: true })
		editor.pointerUp(320, 320, { isPen: true })

		expect(editor.getCurrentPageShapes().length).toBe(1)
		const shape = editor.getCurrentPageShapes()[0] as TLDrawShape

		const bounds = editor.getShapePageBounds(shape.id)!
		expect(bounds.minX).toBeGreaterThan(200)
		expect(bounds.minY).toBeGreaterThan(200)
	})
})
