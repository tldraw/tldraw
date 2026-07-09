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

describe('DefaultDebugMenu and window.editor', () => {
	// Exposing `window.editor` is a host-app responsibility, not the SDK's: apps that want it set it
	// themselves (usually in `onMount`). The debug menu must not touch the global at all.
	it('never sets window.editor when debug mode is toggled', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw onMount={onMount} />,
			{ waitForPatterns: false }
		)
		expect(windowEditor()).toBeUndefined()

		setDebugMode(editor, true)
		// Give any (unwanted) effect a chance to run before asserting it didn't.
		await act(async () => {
			await Promise.resolve()
		})
		expect(windowEditor()).toBeUndefined()

		setDebugMode(editor, false)
		await act(async () => {
			await Promise.resolve()
		})
		expect(windowEditor()).toBeUndefined()
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

		// Toggling debug mode on and back off must leave the host's value untouched.
		setDebugMode(editor, true)
		expect(windowEditor()).toBe(editor)
		setDebugMode(editor, false)
		await waitFor(() => expect(windowEditor()).toBe(editor))
	})
})
