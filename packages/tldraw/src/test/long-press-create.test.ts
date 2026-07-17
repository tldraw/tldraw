import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

vi.useFakeTimers()

// On a touch device a long press fires the browser `contextmenu` event. A discrete
// shape-creation tool (geo, note, line, text, arrow, frame) should respond by
// canceling any pending creation and returning to its own idle state, so the long
// press leaves no shape behind (#8277) and opens no menu — the context menu is a
// select-tool surface, reached on touch only from the select tool. The guard is
// `isCoarsePointer`, so fine-pointer (desktop) behavior must be preserved.
// Continuous-gesture tools (draw, highlight, eraser, laser) are excluded: their
// press is their own action, so a long press keeps that gesture going.
const CREATION_TOOLS = [
	{ tool: 'geo', pointingState: 'geo.pointing' },
	{ tool: 'note', pointingState: 'note.pointing' },
	{ tool: 'text', pointingState: 'text.pointing' },
	{ tool: 'line', pointingState: 'line.pointing' },
	{ tool: 'arrow', pointingState: 'arrow.pointing' },
	{ tool: 'frame', pointingState: 'frame.pointing' },
] as const

describe('long press on shape-creation tools', () => {
	describe('with a coarse pointer', () => {
		beforeEach(() => {
			editor.updateInstanceState({ isCoarsePointer: true })
		})

		it.each(CREATION_TOOLS)(
			'$tool cancels creation and returns to its idle state, leaving no shape behind',
			({ tool }) => {
				editor.setCurrentTool(tool)
				editor.pointerDown(100, 100)
				vi.advanceTimersByTime(editor.options.longPressDurationMs)

				// back in the tool's own idle — not switched to select, no menu
				editor.expectToBeIn(`${tool}.idle`)
				expect(editor.getCurrentPageShapes()).toHaveLength(0)

				// releasing the long press must not create a shape either
				editor.pointerUp(100, 100)
				expect(editor.getCurrentPageShapes()).toHaveLength(0)
			}
		)

		it('continuous-gesture tools keep their gesture on long press', () => {
			// Unlike the discrete tools, a freehand tool starts a stroke on
			// pointer-down, so the long press is part of the stroke. It must not
			// cancel — the stroke continues.
			editor.setCurrentTool('draw')
			editor.pointerDown(100, 100)
			editor.expectToBeIn('draw.drawing')

			vi.advanceTimersByTime(editor.options.longPressDurationMs)

			editor.expectToBeIn('draw.drawing')
			editor.pointerUp(100, 100)
			expect(editor.getCurrentPageShapes()).toHaveLength(1)
		})

		it('defers note creation so a long press never flashes a note', () => {
			// The note creates on press, so without deferral the long-press cancel
			// would briefly show then remove it. On a coarse pointer it is created on
			// release (or drag) instead, so nothing appears during the press.
			editor.setCurrentTool('note')
			editor.pointerDown(100, 100)
			expect(editor.getCurrentPageShapes()).toHaveLength(0)

			// a tap still creates the note on release
			editor.pointerUp(100, 100)
			const shapes = editor.getCurrentPageShapes()
			expect(shapes).toHaveLength(1)
			expect(shapes[0].type).toBe('note')
		})
	})

	describe('with a fine pointer, the long press is ignored', () => {
		beforeEach(() => {
			editor.updateInstanceState({ isCoarsePointer: false })
		})

		it.each(CREATION_TOOLS)('$tool stays in $pointingState', ({ tool, pointingState }) => {
			editor.setCurrentTool(tool)
			editor.pointerDown(100, 100)
			editor.expectToBeIn(pointingState)

			vi.advanceTimersByTime(editor.options.longPressDurationMs)

			// desktop behavior is preserved: the tool is still mid-creation
			editor.expectToBeIn(pointingState)
		})
	})
})
