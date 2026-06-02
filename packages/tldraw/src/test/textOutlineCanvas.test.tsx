import { act, waitFor } from '@testing-library/react'
import { Editor } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

let editor: Editor

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor
})

describe('text outline preference (canvas)', () => {
	it('drives the global --tl-text-outline variable for every label at once', async () => {
		const container = editor.getContainer()

		// Enabled by default, so the outline is not globally disabled.
		expect(container.style.getPropertyValue('--tl-text-outline')).not.toBe('none')

		act(() => {
			editor.user.updateUserPreferences({ isTextOutlineEnabled: false })
		})
		await waitFor(() => {
			expect(container.style.getPropertyValue('--tl-text-outline')).toBe('none')
		})

		act(() => {
			editor.user.updateUserPreferences({ isTextOutlineEnabled: true })
		})
		await waitFor(() => {
			expect(container.style.getPropertyValue('--tl-text-outline')).toBe(
				'var(--tl-text-outline-reference)'
			)
		})
	})
})
