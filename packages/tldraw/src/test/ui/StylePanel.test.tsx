import { act, screen, waitFor } from '@testing-library/react'
import { DefaultColorStyle, Editor } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

let editor: Editor

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor

	act(() => {
		editor.user.updateUserPreferences({ colorScheme: 'light' })
		editor.setStyleForNextShapes(DefaultColorStyle, 'black')
	})
})

function getBlackColorSwatch() {
	return screen.getByTestId('style.color.black') as HTMLElement
}

describe('StylePanel', () => {
	it('updates the black color swatch when switching color modes', async () => {
		await screen.findByTestId('style.color.black')

		expect(getBlackColorSwatch().style.color).toBe('rgb(29, 29, 29)')

		act(() => {
			editor.user.updateUserPreferences({ colorScheme: 'dark' })
		})

		await waitFor(() => {
			expect(getBlackColorSwatch().style.color).toBe('rgb(242, 242, 242)')
		})

		act(() => {
			editor.user.updateUserPreferences({ colorScheme: 'light' })
		})

		await waitFor(() => {
			expect(getBlackColorSwatch().style.color).toBe('rgb(29, 29, 29)')
		})
	})
})
