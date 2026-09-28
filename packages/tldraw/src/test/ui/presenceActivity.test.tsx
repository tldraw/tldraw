import { act } from '@testing-library/react'
import { TLPOINTER_ID } from '@tldraw/editor'
import { createUserId, InstancePresenceRecordType } from '@tldraw/tlschema'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

it('counts keydown as presence activity even when shortcuts are disabled', async () => {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} />,
		{ waitForPatterns: false }
	)

	act(() => {
		// The document key handlers only register while the editor is focused.
		editor.updateInstanceState({ isFocused: true })
		editor.store.put([
			InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId('peer'),
				userId: createUserId('peer'),
				userName: 'Peer',
				currentPageId: editor.getCurrentPageId(),
			}),
		])
	})

	// Focus a text input inside the container, the same situation as editing a
	// text shape: shortcuts are disabled, so keydown events return before they
	// reach `Editor.dispatch`.
	const input = document.createElement('input')
	editor.getContainer().appendChild(input)
	input.focus()
	expect(document.activeElement).toBe(input)

	expect(editor.store.get(TLPOINTER_ID)!.lastActivityTimestamp).toBe(0)

	act(() => {
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true }))
	})

	// The event never reached the editor as a key_down...
	expect(editor.inputs.keys.has('KeyA')).toBe(false)
	// ...but it still counts as presence activity.
	expect(editor.store.get(TLPOINTER_ID)!.lastActivityTimestamp).toBeGreaterThan(0)
})
