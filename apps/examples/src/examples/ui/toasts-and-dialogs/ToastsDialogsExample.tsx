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
	useContainer,
	useDialogs,
	useToasts,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file

// [1]
function MyDialog({ onClose }: { onClose(): void }) {
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
function MySimpleDialog({ onClose }: { onClose(): void }) {
	return (
		<div style={{ padding: 16 }}>
			<h2>Title</h2>
			<p>Description...</p>
			<button onClick={onClose}>Okay</button>
		</div>
	)
}

// [3]
function MyDialogWithSelect({ onClose }: { onClose(): void }) {
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

// [4] A dialog that opens a second dialog, so the two stack. Stacked dialogs stay modal,
// so each one — including the topmost — keeps its own controls interactive (taps included).
function MyNestedDialog({ onClose }: { onClose(): void }) {
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

function MyConfirmDialog({ onClose }: { onClose(): void }) {
	return (
		<div data-testid="dialog-nested" style={{ padding: 16 }}>
			<h2>Nested dialog</h2>
			<button data-testid="dialog-nested.confirm" onClick={onClose}>
				Confirm
			</button>
		</div>
	)
}

const CustomSharePanel = () => {
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
						onClose() {
							// You can do something after the dialog is closed
							void null
						},
					})
				}}
			>
				Show dialog
			</button>
			<button
				onClick={() => {
					addDialog({
						component: MySimpleDialog,
						onClose() {
							// You can do something after the dialog is closed
							void null
						},
					})
				}}
			>
				Show simple dialog
			</button>
			<button
				data-testid="show-dialog-with-select"
				onClick={() => {
					addDialog({
						component: MyDialogWithSelect,
						onClose() {
							// You can do something after the dialog is closed
							void null
						},
					})
				}}
			>
				Show dialog with select
			</button>
		</div>
	)
}

// Rendered in front of the canvas rather than in the SharePanel, which overflows
// off-screen on mobile — so the stacked-dialog demo stays reachable on a touchscreen.
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
			<Tldraw components={components} persistenceKey="example" />
		</div>
	)
}

/*

To control toasts and dialogs your app, you can use the `useToasts` and `useDialogs` hooks.
These hooks give you access to functions which allow you to add, remove and clear toasts
and dialogs.

Dialogs are especially customisable, allowing you to pass in a custom component to render
as the dialog content. Alternatively, you can use the `ExampleDialog` component which is
provided by the library.

[1]
The tldraw library provides a set of components that you can use to build your dialogs.
The `onClose` function passed to the dialog component runs when the dialog closes or
is dismissed, but you can also call it from buttons to close the dialog.

[2]
...or you can build your own dialog component!

[3]
Dialogs can contain their own popups, like a select menu. Because tldraw's dialog uses
Radix's dismissable layers, clicking outside an open select closes just the select and
leaves the dialog open — a second outside click then closes the dialog.
*/
