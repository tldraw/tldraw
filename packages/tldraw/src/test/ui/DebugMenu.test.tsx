import { act, waitFor } from '@testing-library/react'
import { Editor } from '@tldraw/editor'
import { afterEach, describe, expect, it } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

function windowEditor() {
	return (window as any).editor as Editor | undefined
}

function setDebugMode(editor: Editor, isDebugMode: boolean) {
	act(() => {
		editor.updateInstanceState({ isDebugMode })
	})
}

afterEach(() => {
	delete (window as any).editor
})

describe('DefaultDebugMenu window.editor', () => {
	it('exposes the editor on window.editor while debug mode is on, and removes it when off', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw onMount={onMount} />,
			{ waitForPatterns: false }
		)
		setDebugMode(editor, false)
		expect(windowEditor()).toBeUndefined()

		setDebugMode(editor, true)
		await waitFor(() => expect(windowEditor()).toBe(editor))

		setDebugMode(editor, false)
		await waitFor(() => expect(windowEditor()).toBeUndefined())
	})

	it('does not clobber a host-set window.editor when debug mode is toggled off', async () => {
		// Host apps (tldraw.com, the desktop app) set `window.editor` themselves in onMount.
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					onMount={(editor) => {
						;(window as any).editor = editor
						onMount(editor)
					}}
				/>
			),
			{ waitForPatterns: false }
		)
		expect(windowEditor()).toBe(editor)

		// Turning debug mode on must leave the host's value in place...
		setDebugMode(editor, true)
		expect(windowEditor()).toBe(editor)

		// ...and turning it back off must not delete the global the host owns.
		setDebugMode(editor, false)
		await waitFor(() => expect(windowEditor()).toBe(editor))
	})
})
