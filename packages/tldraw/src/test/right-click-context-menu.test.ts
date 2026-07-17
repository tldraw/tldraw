import { createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

// A right-click opens the context menu, which is a select-tool surface — every
// item acts on the current selection. The editor routes every right-click
// through the select tool before the event reaches the state chart, so the
// select tool's idle resolves the selection at the click point (selecting the
// shape under the pointer, or clearing the selection) regardless of which tool
// was active. This keeps the menu consistent with the click in any tool, and
// never creates a shape from a creation tool. See #8277 and #8828.

// Shape-creation tools: right-click must switch to select and never create a shape.
const CREATION_TOOLS = ['geo', 'note', 'text', 'line', 'arrow', 'draw', 'frame'] as const

// Other non-select tools: right-click must still switch to select so the menu
// reflects the click rather than a stale selection.
const OTHER_TOOLS = ['hand', 'eraser', 'laser', 'zoom'] as const

describe('right click routes through the select tool', () => {
	it.each(CREATION_TOOLS)('%s switches to the select tool and creates no shape', (tool) => {
		editor.setCurrentTool(tool)

		editor.rightClick(100, 100)

		editor.expectToBeIn('select.idle')
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
	})

	it.each(OTHER_TOOLS)('%s switches to the select tool', (tool) => {
		editor.setCurrentTool(tool)

		editor.rightClick(100, 100)

		editor.expectToBeIn('select.idle')
	})

	it('stays in the select tool when already active', () => {
		editor.setCurrentTool('select')

		editor.rightClick(100, 100)

		editor.expectToBeIn('select.idle')
	})

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

		editor.setCurrentTool('geo')
		editor.rightClick(50, 50)

		editor.expectToBeIn('select.idle')
		expect(editor.getSelectedShapeIds()).toEqual([id])
	})

	it('clears a stale selection when right-clicking empty canvas from another tool', () => {
		const id = createShapeId()
		editor.createShape({
			id,
			type: 'geo',
			x: 0,
			y: 0,
			props: { w: 100, h: 100, geo: 'rectangle' },
		})
		editor.select(id)

		// right-click far from the selected shape, while a non-select tool is active
		editor.setCurrentTool('hand')
		editor.rightClick(500, 500)

		editor.expectToBeIn('select.idle')
		expect(editor.getSelectedShapeIds()).toEqual([])
	})
})
