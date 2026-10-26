import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { createShapeId, Editor } from '@tldraw/editor'
import { TLComponents, Tldraw } from '../../lib/Tldraw'
import { EditLinkDialog } from '../../lib/ui/components/EditLinkDialog'
import { useDialogs } from '../../lib/ui/context/dialogs'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

function OpenEditLinkDialogButton() {
	const { addDialog } = useDialogs()
	return (
		<button data-testid="open-edit-link" onClick={() => addDialog({ component: EditLinkDialog })}>
			open
		</button>
	)
}

const components: TLComponents = {
	SharePanel: () => <OpenEditLinkDialogButton />,
}

const shapeId = createShapeId('box')

async function renderWithOpenDialog() {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw components={components} onMount={onMount} />,
		{ waitForPatterns: false }
	)

	act(() => {
		editor.createShape({ id: shapeId, type: 'geo', props: { url: 'https://tldraw.com' } })
		editor.select(shapeId)
	})

	fireEvent.click(screen.getByTestId('open-edit-link'))
	await waitFor(() => expect(getDialogFrame()).not.toBeNull())

	return editor
}

// The dialog frame that wraps whatever the dialog component renders. The bug left this
// frame mounted and empty, so checking only for the dialog's own content would not catch it.
function getDialogFrame() {
	return document.querySelector('.tlui-dialog__content')
}

async function expectDialogClosed() {
	await act(async () => {})
	expect(getDialogFrame()).toBeNull()
}

let editor: Editor

afterEach(() => {
	editor?.dispose()
})

it('closes itself when the shape is deleted while the dialog is open', async () => {
	editor = await renderWithOpenDialog()
	expect(getDialogFrame()).not.toBeNull()

	act(() => {
		editor.deleteShape(shapeId)
	})

	await expectDialogClosed()
})

it('closes itself when the shape is deselected while the dialog is open', async () => {
	editor = await renderWithOpenDialog()
	expect(getDialogFrame()).not.toBeNull()

	act(() => {
		editor.selectNone()
	})

	await expectDialogClosed()
})

function submitLink(value: string) {
	const input = document.querySelector('.tlui-edit-link-dialog__input') as HTMLInputElement
	fireEvent.change(input, { target: { value } })
	fireEvent.keyDown(input, { key: 'Enter' })
}

it.each([
	['mailto:hello@tldraw.com', 'mailto:hello@tldraw.com'],
	['codex://threads/abc-123', 'codex://threads/abc-123'],
	['example.com', 'https://example.com'],
	['', ''],
])('saves %j as %j', async (input, expected) => {
	editor = await renderWithOpenDialog()
	act(() => submitLink(input))
	await expectDialogClosed()
	expect(editor.getShape(shapeId)!.props).toMatchObject({ url: expected })
})

it('does not save an invalid url on enter', async () => {
	editor = await renderWithOpenDialog()
	act(() => submitLink('hello'))
	await act(async () => {})
	expect(getDialogFrame()).not.toBeNull()
	expect(editor.getShape(shapeId)!.props).toMatchObject({ url: 'https://tldraw.com' })
})
