import { fireEvent, screen } from '@testing-library/react'
import { Select as _Select } from 'radix-ui'
import { TLComponents, Tldraw } from '../../lib/Tldraw'
import { useDialogs } from '../../lib/ui/context/dialogs'
import { renderTldrawComponent } from '../testutils/renderTldrawComponent'

// jsdom doesn't implement scrollIntoView, which Radix Select calls when it opens.
Element.prototype.scrollIntoView ??= () => {}

function DialogWithSelect({ onClose }: { onClose(): void }) {
	return (
		<div data-testid="dialog-inner">
			<_Select.Root defaultValue="a">
				<_Select.Trigger data-testid="select-trigger">
					<_Select.Value />
				</_Select.Trigger>
				<_Select.Portal>
					<_Select.Content data-testid="select-content">
						<_Select.Viewport>
							<_Select.Item value="a" data-testid="select-a">
								<_Select.ItemText>A</_Select.ItemText>
							</_Select.Item>
							<_Select.Item value="b" data-testid="select-b">
								<_Select.ItemText>B</_Select.ItemText>
							</_Select.Item>
						</_Select.Viewport>
					</_Select.Content>
				</_Select.Portal>
			</_Select.Root>
			<button data-testid="dialog-close" onClick={onClose}>
				Close
			</button>
		</div>
	)
}

function OpenDialogButton({ preventBackgroundClose }: { preventBackgroundClose?: boolean }) {
	const { addDialog } = useDialogs()
	return (
		<button
			data-testid="open-dialog"
			onClick={() => addDialog({ component: DialogWithSelect, preventBackgroundClose })}
		>
			open
		</button>
	)
}

// A confirm-style dialog opened from inside another dialog (e.g. the dotcom workspace
// settings dialog's regenerate/leave/delete confirmations).
function NestedConfirmDialog({ onClose }: { onClose(): void }) {
	return (
		<div data-testid="nested-dialog">
			<button data-testid="nested-confirm" onClick={onClose}>
				Confirm
			</button>
		</div>
	)
}

function DialogThatOpensNested({ onClose }: { onClose(): void }) {
	const { addDialog } = useDialogs()
	return (
		<div data-testid="parent-dialog">
			<button
				data-testid="open-nested"
				onClick={() => addDialog({ component: NestedConfirmDialog })}
			>
				open nested
			</button>
			<button data-testid="parent-close" onClick={onClose}>
				Close
			</button>
		</div>
	)
}

function OpenParentDialogButton() {
	const { addDialog } = useDialogs()
	return (
		<button
			data-testid="open-parent"
			onClick={() => addDialog({ component: DialogThatOpensNested })}
		>
			open parent
		</button>
	)
}

function renderWithParentDialog() {
	const components: TLComponents = {
		SharePanel: () => <OpenParentDialogButton />,
	}
	return renderTldrawComponent(<Tldraw components={components} />, { waitForPatterns: false })
}

function renderWithDialog(opts: { preventBackgroundClose?: boolean } = {}) {
	const components: TLComponents = {
		SharePanel: () => <OpenDialogButton preventBackgroundClose={opts.preventBackgroundClose} />,
	}
	return renderTldrawComponent(<Tldraw components={components} />, { waitForPatterns: false })
}

// A full press on the dialog backdrop. Radix dismisses on pointer-down, but we fire the
// whole sequence so a layer-blind click handler (the bug this guards against) would be caught.
function pressBackdrop() {
	const el = document.querySelector('.tlui-dialog__positioner')
	if (!el) throw new Error('dialog positioner (backdrop) not found')
	fireEvent.pointerDown(el, { pointerType: 'mouse' })
	fireEvent.pointerUp(el, { pointerType: 'mouse' })
	fireEvent.click(el)
}

// Press the backdrop of the topmost dialog (the last positioner in the DOM) — used when
// dialogs are stacked, so the press lands on the layer that should dismiss first.
function pressTopBackdrop() {
	const positioners = document.querySelectorAll('.tlui-dialog__positioner')
	const el = positioners[positioners.length - 1]
	if (!el) throw new Error('dialog positioner (backdrop) not found')
	fireEvent.pointerDown(el, { pointerType: 'mouse' })
	fireEvent.pointerUp(el, { pointerType: 'mouse' })
	fireEvent.click(el)
}

it('dismisses a select opened inside a modal before the modal itself', async () => {
	await renderWithDialog()

	fireEvent.click(screen.getByTestId('open-dialog'))
	await screen.findByTestId('dialog-inner')

	// Open the select.
	fireEvent.pointerDown(screen.getByTestId('select-trigger'), { button: 0, pointerType: 'mouse' })
	await screen.findByTestId('select-content')

	// A press on the dialog backdrop closes only the select; the dialog stays open.
	pressBackdrop()
	expect(screen.queryByTestId('select-content')).toBeNull()
	expect(screen.queryByTestId('dialog-inner')).not.toBeNull()

	// A second press on the backdrop then closes the dialog.
	pressBackdrop()
	expect(screen.queryByTestId('dialog-inner')).toBeNull()
})

it('dismisses a normal dialog on a backdrop press', async () => {
	await renderWithDialog()

	fireEvent.click(screen.getByTestId('open-dialog'))
	await screen.findByTestId('dialog-inner')

	pressBackdrop()
	expect(screen.queryByTestId('dialog-inner')).toBeNull()
})

it('does not dismiss when a press starts inside the content and ends on the backdrop', async () => {
	await renderWithDialog()

	fireEvent.click(screen.getByTestId('open-dialog'))
	await screen.findByTestId('dialog-inner')

	// A press that starts inside the content (e.g. selecting text)...
	fireEvent.pointerDown(screen.getByTestId('dialog-inner'), { pointerType: 'mouse' })
	// ...and is released on the backdrop should not dismiss the dialog, since Radix
	// dismisses on pointer-down and the press began inside the content.
	const el = document.querySelector('.tlui-dialog__positioner')!
	fireEvent.pointerUp(el, { pointerType: 'mouse' })
	fireEvent.click(el)

	expect(screen.queryByTestId('dialog-inner')).not.toBeNull()
})

it('dismisses a dialog on escape', async () => {
	await renderWithDialog()

	fireEvent.click(screen.getByTestId('open-dialog'))
	await screen.findByTestId('dialog-inner')

	fireEvent.keyDown(document.body, { key: 'Escape' })
	expect(screen.queryByTestId('dialog-inner')).toBeNull()
})

it('escape dismisses one stacked layer at a time: the select first, then the dialog', async () => {
	await renderWithDialog()

	fireEvent.click(screen.getByTestId('open-dialog'))
	await screen.findByTestId('dialog-inner')

	fireEvent.pointerDown(screen.getByTestId('select-trigger'), { button: 0, pointerType: 'mouse' })
	await screen.findByTestId('select-content')

	// The first escape closes only the select (the topmost layer); the dialog stays.
	fireEvent.keyDown(document.body, { key: 'Escape' })
	expect(screen.queryByTestId('select-content')).toBeNull()
	expect(screen.queryByTestId('dialog-inner')).not.toBeNull()

	// The second escape then closes the dialog.
	fireEvent.keyDown(document.body, { key: 'Escape' })
	expect(screen.queryByTestId('dialog-inner')).toBeNull()
})

it('keeps a preventBackgroundClose dialog open on a backdrop press but still closes on escape', async () => {
	await renderWithDialog({ preventBackgroundClose: true })

	fireEvent.click(screen.getByTestId('open-dialog'))
	await screen.findByTestId('dialog-inner')

	// A backdrop press is ignored...
	pressBackdrop()
	expect(screen.queryByTestId('dialog-inner')).not.toBeNull()

	// ...but escape still dismisses the dialog.
	fireEvent.keyDown(document.body, { key: 'Escape' })
	expect(screen.queryByTestId('dialog-inner')).toBeNull()
})

it('backdrop presses dismiss stacked dialogs one layer at a time', async () => {
	await renderWithParentDialog()

	fireEvent.click(screen.getByTestId('open-parent'))
	await screen.findByTestId('parent-dialog')

	fireEvent.click(screen.getByTestId('open-nested'))
	await screen.findByTestId('nested-dialog')

	// Opening the nested dialog (which stacks on top and grabs focus) must not dismiss
	// the parent — the dialogs stack rather than collapsing together.
	expect(screen.queryByTestId('parent-dialog')).not.toBeNull()

	// A backdrop press closes only the topmost (nested) dialog; the parent stays open.
	pressTopBackdrop()
	expect(screen.queryByTestId('nested-dialog')).toBeNull()
	expect(screen.queryByTestId('parent-dialog')).not.toBeNull()

	// A second backdrop press then closes the parent.
	pressTopBackdrop()
	expect(screen.queryByTestId('parent-dialog')).toBeNull()
})

it('escape dismisses a nested dialog before its parent', async () => {
	await renderWithParentDialog()

	fireEvent.click(screen.getByTestId('open-parent'))
	await screen.findByTestId('parent-dialog')

	fireEvent.click(screen.getByTestId('open-nested'))
	await screen.findByTestId('nested-dialog')

	// The first escape closes only the nested dialog; the parent stays.
	fireEvent.keyDown(document.body, { key: 'Escape' })
	expect(screen.queryByTestId('nested-dialog')).toBeNull()
	expect(screen.queryByTestId('parent-dialog')).not.toBeNull()

	// The second escape then closes the parent.
	fireEvent.keyDown(document.body, { key: 'Escape' })
	expect(screen.queryByTestId('parent-dialog')).toBeNull()
})
