import { Select as _Select } from 'radix-ui'
import { useState } from 'react'
import {
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TLUiDialogProps,
	useContainer,
	useDialogs,
	useToasts,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file

// [1]
function MyDialog({ onClose }: TLUiDialogProps) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Title</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<p>
					This dialog body holds a few sentences of text so you can see how longer content behaves.
					Regular prose wraps onto multiple lines within the dialog width.
				</p>
				<p>
					Long unbroken strings, like
					https://example.com/a/really/long/url/that/cannot/wrap/onto/the/next/line, also break
					instead of overflowing or being clipped.
				</p>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>Cancel</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={onClose}>
					<TldrawUiButtonLabel>Continue</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}

// [2]
function MySimpleDialog({ onClose }: TLUiDialogProps) {
	return (
		<div style={{ padding: 16 }}>
			<h2>Title</h2>
			<p>Description...</p>
			<button onClick={onClose}>Okay</button>
		</div>
	)
}

// [3]
function MyDialogWithSelect({ onClose }: TLUiDialogProps) {
	const container = useContainer()
	const [value, setValue] = useState('a')
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Dialog with a select</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<p>A select opened inside a modal is its own dismissable layer.</p>
				<_Select.Root value={value} onValueChange={setValue}>
					<_Select.Trigger
						data-testid="dialog-select.trigger"
						style={{ display: 'flex', alignItems: 'center', gap: 8 }}
					>
						<_Select.Value />
						<_Select.Icon>▾</_Select.Icon>
					</_Select.Trigger>
					<_Select.Portal container={container}>
						<_Select.Content
							data-testid="dialog-select.content"
							position="popper"
							sideOffset={4}
							style={{
								backgroundColor: 'var(--tl-color-panel)',
								boxShadow: 'var(--tl-shadow-3)',
								borderRadius: 'var(--tl-radius-2)',
								padding: 4,
								zIndex: 'var(--tl-layer-canvas-overlays)',
							}}
						>
							<_Select.Viewport>
								{['a', 'b', 'c'].map((v) => (
									<_Select.Item
										key={v}
										value={v}
										data-testid={`dialog-select.item-${v}`}
										style={{ padding: '4px 8px', cursor: 'pointer' }}
									>
										<_Select.ItemText>Option {v}</_Select.ItemText>
									</_Select.Item>
								))}
							</_Select.Viewport>
						</_Select.Content>
					</_Select.Portal>
				</_Select.Root>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="primary" onClick={onClose}>
					<TldrawUiButtonLabel>Done</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}

// [4]
function MyNestedDialog({ onClose }: TLUiDialogProps) {
	const { addDialog } = useDialogs()
	return (
		<div data-testid="dialog-parent" style={{ padding: 16 }}>
			<h2>Parent dialog</h2>
			<p>Opens another dialog on top of itself.</p>
			<button
				data-testid="dialog-parent.open-nested"
				onClick={() => addDialog({ component: MyConfirmDialog })}
			>
				Open nested dialog
			</button>
			<button onClick={onClose}>Close</button>
		</div>
	)
}

function MyConfirmDialog({ onClose }: TLUiDialogProps) {
	return (
		<div data-testid="dialog-nested" style={{ padding: 16 }}>
			<h2>Nested dialog</h2>
			<button data-testid="dialog-nested.confirm" onClick={onClose}>
				Confirm
			</button>
		</div>
	)
}

// [5]
function CustomSharePanel() {
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()

	return (
		<div style={{ padding: 16, gap: 16, display: 'flex', pointerEvents: 'all' }}>
			<button
				onClick={() => {
					addToast({ title: 'Hello world!', severity: 'success' })
				}}
			>
				Show toast
			</button>
			<button
				onClick={() => {
					addToast({
						title: 'This is a very long toast title that keeps going and going',
						description:
							'Long descriptions and unbroken strings like https://example.com/a/really/long/url/that/cannot/wrap/onto/the/next/line wrap within the toast instead of overflowing.',
						severity: 'info',
					})
				}}
			>
				Show long toast
			</button>
			<button
				data-testid="show-dialog"
				onClick={() => {
					addDialog({
						component: MyDialog,
						onClose: () => addToast({ title: 'Dialog closed', severity: 'info' }),
					})
				}}
			>
				Show dialog
			</button>
			<button
				onClick={() => {
					addDialog({ component: MySimpleDialog })
				}}
			>
				Show simple dialog
			</button>
			<button
				data-testid="show-dialog-with-select"
				onClick={() => {
					addDialog({ component: MyDialogWithSelect })
				}}
			>
				Show dialog with select
			</button>
		</div>
	)
}

// [6]
function StackedDialogLauncher() {
	const { addDialog } = useDialogs()
	return (
		<button
			data-testid="show-nested-dialog"
			style={{
				position: 'absolute',
				top: '50%',
				left: 8,
				transform: 'translateY(-50%)',
				pointerEvents: 'all',
			}}
			onClick={() => addDialog({ component: MyNestedDialog })}
		>
			Show nested dialog
		</button>
	)
}

const components: TLComponents = {
	SharePanel: CustomSharePanel,
	InFrontOfTheCanvas: StackedDialogLauncher,
}

export default function ToastsDialogsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} persistenceKey="toasts-and-dialogs-example" />
		</div>
	)
}

/*
The `useToasts` and `useDialogs` hooks return functions to add, remove, and
clear toasts and dialogs from anywhere inside `<Tldraw />`.

[1]
A dialog built from tldraw's dialog primitives (`TldrawUiDialogHeader`,
`TldrawUiDialogBody`, `TldrawUiDialogFooter`, and so on), so it matches the rest
of the UI. `onClose` is passed to your component by the dialog system; call it
from your own buttons to close the dialog. The `onClose` you pass to `addDialog`
is separate: it runs after the dialog closes, however it was dismissed (here we
show a toast from it).

[2]
...or render anything you like. The dialog system only supplies the modal
wrapper and the `onClose` callback.

[3]
Dialogs can contain their own popups, like this Radix select. Because tldraw's
dialog is a Radix dismissable layer, clicking outside an open select closes just
the select and leaves the dialog open; a second outside click closes the dialog.
Portal the select into `useContainer()` so it inherits tldraw's CSS variables.

[4]
Dialogs stack. A dialog can call `addDialog` to open another on top of itself,
and each one, including the topmost, keeps its own controls interactive.

[5]
The launcher buttons live in the `SharePanel` slot, top right of the UI.

[6]
The stacked-dialog launcher is rendered in `InFrontOfTheCanvas` instead, because
the share panel overflows off-screen on narrow mobile layouts and the e2e test
for stacked dialogs needs to reach it with a tap.
*/
