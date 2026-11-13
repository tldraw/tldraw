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

async function renderWithOpenDialog(url = 'https://tldraw.com') {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw components={components} onMount={onMount} />,
		{ waitForPatterns: false }
	)

	act(() => {
		editor.createShape({ id: shapeId, type: 'geo', props: { url } })
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

function getInput() {
	return document.querySelector('.tlui-edit-link-dialog__input') as HTMLInputElement
}

async function typeAndPressEnter(value: string) {
	const input = getInput()
	act(() => input.focus())
	fireEvent.change(input, { target: { value } })
	fireEvent.keyDown(input, { key: 'Enter' })
	await act(async () => {})
}

it('saves a valid url when Enter is pressed', async () => {
	editor = await renderWithOpenDialog()

	await typeAndPressEnter('example.com')

	expect(editor.getShape(shapeId)?.props).toMatchObject({ url: 'https://example.com' })
	expect(getDialogFrame()).toBeNull()
})

it('does not clear an existing link when Enter is pressed with an invalid url', async () => {
	editor = await renderWithOpenDialog()

	await typeAndPressEnter('foo bar')

	expect(screen.getByText('A link must be a valid URL.')).toBeTruthy()
	expect(editor.getShape(shapeId)?.props).toMatchObject({ url: 'https://tldraw.com' })
	expect(getDialogFrame()).not.toBeNull()
	expect(document.activeElement).toBe(getInput())
})

it('does nothing when Enter is pressed with an invalid url on a shape without a link', async () => {
	editor = await renderWithOpenDialog('')

	await typeAndPressEnter('foo bar')

	expect(screen.getByText('A link must be a valid URL.')).toBeTruthy()
	expect(editor.getShape(shapeId)?.props).toMatchObject({ url: '' })
	expect(getDialogFrame()).not.toBeNull()
	expect(document.activeElement).toBe(getInput())
})
