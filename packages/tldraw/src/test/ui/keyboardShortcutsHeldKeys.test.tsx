import { act } from '@testing-library/react'
import { Editor } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

async function setup() {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} />,
		{ waitForPatterns: false }
	)

	// Shortcuts only register while the editor is focused.
	act(() => {
		editor.updateInstanceState({ isFocused: true })
	})

	return { editor }
}

function keydown(editor: Editor, init: KeyboardEventInit) {
	act(() => {
		editor
			.getContainerDocument()
			.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
	})
}

function keyup(editor: Editor, init: KeyboardEventInit) {
	act(() => {
		editor
			.getContainerDocument()
			.body.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, ...init }))
	})
}

describe('keyboard shortcuts with a held key', () => {
	it('fires the plain shortcut on a fresh key press', async () => {
		const { editor } = await setup()
		expect(editor.getInstanceState().isToolLocked).toBe(false)

		// Plain `q` toggles tool lock.
		keydown(editor, { key: 'q', code: 'KeyQ' })
		expect(editor.getInstanceState().isToolLocked).toBe(true)
	})

	it('does not fall back to the plain shortcut when a modifier is released mid-hold', async () => {
		const { editor } = await setup()
		expect(editor.getInstanceState().isToolLocked).toBe(false)

		// Press shift+q (copy-hovered-styles), which does not toggle tool lock.
		keydown(editor, { key: 'q', code: 'KeyQ', shiftKey: true })
		expect(editor.getInstanceState().isToolLocked).toBe(false)

		// Release shift but keep holding q. The auto-repeat keydown events should not start
		// firing the adjacent plain `q` shortcut (toggle tool lock).
		keydown(editor, { key: 'q', code: 'KeyQ', shiftKey: false, repeat: true })
		keydown(editor, { key: 'q', code: 'KeyQ', shiftKey: false, repeat: true })
		expect(editor.getInstanceState().isToolLocked).toBe(false)
	})

	it('fires the plain shortcut again after the held key is released and pressed fresh', async () => {
		const { editor } = await setup()

		keydown(editor, { key: 'q', code: 'KeyQ', shiftKey: true })
		keydown(editor, { key: 'q', code: 'KeyQ', shiftKey: false, repeat: true })
		expect(editor.getInstanceState().isToolLocked).toBe(false)

		// Releasing the physical key clears the held-key tracking, so a fresh press works again.
		keyup(editor, { key: 'q', code: 'KeyQ' })
		keydown(editor, { key: 'q', code: 'KeyQ' })
		expect(editor.getInstanceState().isToolLocked).toBe(true)
	})
})
