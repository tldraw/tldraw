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

function submitLink(value: string) {
	const input = document.querySelector('.tlui-edit-link-dialog__input') as HTMLInputElement
	fireEvent.change(input, { target: { value } })
	fireEvent.keyDown(input, { key: 'Enter' })
}

it.each([
	['example.com', 'https://example.com'],
	['', ''],
])('saves %j as %j', async (input, expected) => {
	editor = await renderWithOpenDialog()
	act(() => submitLink(input))
	await expectDialogClosed()
	expect(editor.getShape(shapeId)!.props).toMatchObject({ url: expected })
})

it.each(['https://tldraw.com', ''])(
	'does not save an invalid url on enter when the link was %j',
	async (url) => {
		editor = await renderWithOpenDialog(url)
		act(() => submitLink('hello'))
		await act(async () => {})
		expect(getDialogFrame()).not.toBeNull()
		expect(screen.getByText('A link must be a valid URL.')).toBeTruthy()
		expect(editor.getShape(shapeId)!.props).toMatchObject({ url })
	}
)

function getSubmitButton() {
	const footer = document.querySelector('.tlui-dialog__footer__actions')!
	const buttons = footer.querySelectorAll('button')
	const button = buttons[buttons.length - 1]
	return { label: button.textContent, disabled: button.disabled }
}

it.each([
	['', '', { label: 'Continue', disabled: true }],
	['', 'example.com', { label: 'Continue', disabled: false }],
	['', 'hello', { label: 'Continue', disabled: true }],
	['https://tldraw.com', '', { label: 'Clear', disabled: false }],
	['https://tldraw.com', 'example.com', { label: 'Continue', disabled: false }],
	['https://tldraw.com', 'hello', { label: 'Continue', disabled: true }],
])('with link %j and input %j, the submit button is %j', async (url, input, expected) => {
	editor = await renderWithOpenDialog(url)
	const field = document.querySelector('.tlui-edit-link-dialog__input') as HTMLInputElement
	act(() => {
		fireEvent.change(field, { target: { value: input } })
	})
	expect(getSubmitButton()).toEqual(expected)
})
