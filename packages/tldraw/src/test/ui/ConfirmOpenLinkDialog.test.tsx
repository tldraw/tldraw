import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

const shapeId = createShapeId('box')

let open: ReturnType<typeof vi.spyOn>

beforeEach(() => {
	open = vi.spyOn(window, 'open').mockImplementation(() => null)
})

afterEach(() => {
	open.mockRestore()
})

async function renderWithLink(url: string) {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} />,
		{ waitForPatterns: false }
	)
	act(() => {
		editor.createShape({ id: shapeId, type: 'geo', props: { url } })
	})
	return editor
}

function getHyperlinkButton() {
	return document.querySelector('.tl-hyperlink-button') as HTMLAnchorElement
}

function getDialogFrame() {
	return document.querySelector('.tlui-dialog__content')
}

describe('opening a shape link', () => {
	it('opens a trusted app link without asking', async () => {
		await renderWithLink('vscode://file/src/index.ts')
		fireEvent.click(getHyperlinkButton())
		expect(open).toHaveBeenCalledWith('vscode://file/src/index.ts', '_blank', 'noopener noreferrer')
		expect(getDialogFrame()).toBeNull()
	})

	it('checks a middle click too, and ignores a right click', async () => {
		await renderWithLink('chatgpt://chat/123')
		fireEvent(getHyperlinkButton(), new MouseEvent('auxclick', { bubbles: true, button: 2 }))
		expect(getDialogFrame()).toBeNull()
		fireEvent(getHyperlinkButton(), new MouseEvent('auxclick', { bubbles: true, button: 1 }))
		await waitFor(() => expect(getDialogFrame()).not.toBeNull())
		expect(open).not.toHaveBeenCalled()
	})

	it('asks before opening an unknown app link, and opens it on confirm', async () => {
		await renderWithLink('chatgpt://chat/123')
		fireEvent.click(getHyperlinkButton())
		await waitFor(() => expect(getDialogFrame()).not.toBeNull())
		expect(screen.getByText('chatgpt://chat/123')).toBeTruthy()
		expect(open).not.toHaveBeenCalled()

		fireEvent.click(screen.getByText('Open link'))
		expect(open).toHaveBeenCalledWith('chatgpt://chat/123', '_blank', 'noopener noreferrer')
		await waitFor(() => expect(getDialogFrame()).toBeNull())
	})

	it('does not open an unknown app link when the dialog is cancelled', async () => {
		await renderWithLink('chatgpt://chat/123')
		fireEvent.click(getHyperlinkButton())
		await waitFor(() => expect(getDialogFrame()).not.toBeNull())

		fireEvent.click(screen.getByText('Cancel'))
		await waitFor(() => expect(getDialogFrame()).toBeNull())
		expect(open).not.toHaveBeenCalled()
	})
})
