import { createShapeId } from '@tldraw/editor'
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

// On a touch device a long press fires the browser `contextmenu` event. Each
// shape-creation tool should respond to the long press by canceling any pending
// creation and routing through the select tool — so the context menu opens as
// the normal selection menu with no stray shape left behind. The guard is
// `isCoarsePointer`, so fine-pointer (desktop) behavior must be preserved.
// See #8277.
const CREATION_TOOLS = [
	{ tool: 'geo', pointingState: 'geo.pointing' },
	{ tool: 'note', pointingState: 'note.pointing' },
	{ tool: 'text', pointingState: 'text.pointing' },
	{ tool: 'line', pointingState: 'line.pointing' },
	{ tool: 'arrow', pointingState: 'arrow.pointing' },
	{ tool: 'draw', pointingState: 'draw.drawing' },
	{ tool: 'frame', pointingState: 'frame.pointing' },
] as const

describe('long press on shape-creation tools', () => {
	describe('with a coarse pointer', () => {
		beforeEach(() => {
			editor.updateInstanceState({ isCoarsePointer: true })
		})

		it.each(CREATION_TOOLS)(
			'$tool cancels creation and switches to the select tool, leaving no shape behind',
			({ tool }) => {
				editor.setCurrentTool(tool)
				editor.pointerDown(100, 100)
				vi.advanceTimersByTime(editor.options.longPressDurationMs)

				// routed through the select tool so the menu has full content
				editor.expectToBeIn('select.idle')
				expect(editor.getCurrentPageShapes()).toHaveLength(0)

				// releasing the long press must not create a shape either
				editor.pointerUp(100, 100)
				expect(editor.getCurrentPageShapes()).toHaveLength(0)
			}
		)

		it('selects the shape under the pointer so the menu reflects it', () => {
			const id = createShapeId()
			editor.createShape({
				id,
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, geo: 'rectangle' },
			})
			editor.selectNone()

			// long-press over the existing shape while a shape-creation tool is active
			editor.setCurrentTool('geo')
			editor.pointerDown(50, 50)
			vi.advanceTimersByTime(editor.options.longPressDurationMs)

			editor.expectToBeIn('select.idle')
			expect(editor.getSelectedShapeIds()).toEqual([id])
			// the long-press didn't create a second shape
			expect(editor.getCurrentPageShapes()).toHaveLength(1)
		})

		it('clears the selection when long-pressing empty canvas', () => {
			const id = createShapeId()
			editor.createShape({
				id,
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, geo: 'rectangle' },
			})
			editor.select(id)

			// long-press far away from the shape
			editor.setCurrentTool('geo')
			editor.pointerDown(500, 500)
			vi.advanceTimersByTime(editor.options.longPressDurationMs)

			editor.expectToBeIn('select.idle')
			expect(editor.getSelectedShapeIds()).toEqual([])
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
