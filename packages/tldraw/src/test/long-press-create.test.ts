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
// creation and returning to idle, so the context menu opens with no stray shape
// left behind. The guard is `isCoarsePointer`, so fine-pointer (desktop)
// behavior must be preserved. See #8277.
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
			'$tool cancels creation and returns to idle, leaving no shape behind',
			({ tool }) => {
				editor.setCurrentTool(tool)
				editor.pointerDown(100, 100)
				vi.advanceTimersByTime(editor.options.longPressDurationMs)

				editor.expectToBeIn(`${tool}.idle`)
				expect(editor.getCurrentPageShapes()).toHaveLength(0)

				// releasing the long press must not create a shape either
				editor.pointerUp(100, 100)
				expect(editor.getCurrentPageShapes()).toHaveLength(0)
			}
		)
	})

	describe('with a fine pointer', () => {
		beforeEach(() => {
			editor.updateInstanceState({ isCoarsePointer: false })
		})

		it.each(CREATION_TOOLS)(
			'$tool ignores the long press and stays in $pointingState',
			({ tool, pointingState }) => {
				editor.setCurrentTool(tool)
				editor.pointerDown(100, 100)
				editor.expectToBeIn(pointingState)

				vi.advanceTimersByTime(editor.options.longPressDurationMs)

				// desktop behavior is preserved: the tool is still mid-creation
				editor.expectToBeIn(pointingState)
			}
		)
	})
})
