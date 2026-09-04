import { act } from '@testing-library/react'
import { Editor } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

let editor: Editor
let rendered: Awaited<ReturnType<typeof renderTldrawComponentWithEditor>>['rendered']

beforeEach(async () => {
	// Pin the quick actions into the menu panel so the test does not depend on jsdom's viewport width
	;({ editor, rendered } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} options={{ actionShortcutsLocation: 'menu' }} />,
		{ waitForPatterns: true }
	))
})

afterEach(() => {
	editor?.dispose()
})

describe('actions menu in readonly mode', () => {
	it('shows the actions menu button when not readonly', async () => {
		expect(await rendered.findByTestId('actions-menu.button')).toBeTruthy()
	})

	it.each(['select', 'hand', 'zoom', 'eraser'])(
		'hides the actions menu button in readonly mode with the %s tool',
		async (toolId) => {
			act(() => {
				editor.updateInstanceState({ isReadonly: true })
				editor.setCurrentTool(toolId)
			})
			expect(editor.getCurrentToolId()).toBe(toolId)
			expect(rendered.queryByTestId('actions-menu.button')).toBeNull()
		}
	)
})
