import { useContainer, useValue } from '@tldraw/editor'
import { Dialog as _Dialog } from 'radix-ui'
import { memo, useCallback } from 'react'
import { TLUiDialog, useDialogs } from '../context/dialogs'
import { useDirection } from '../hooks/useTranslation/useTranslation'

/** @internal */
const TldrawUiDialog = ({ id, component: ModalContent, preventBackgroundClose }: TLUiDialog) => {
	const { removeDialog } = useDialogs()

	const container = useContainer()
	const dir = useDirection()

	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				removeDialog(id)
			}
		},
		[id, removeDialog]
	)

	return (
		<_Dialog.Root onOpenChange={handleOpenChange} defaultOpen>
			<_Dialog.Portal container={container}>
				{/* Radix renders the scrim and content as siblings. The positioner sits on
				    top of the scrim and centers the content, scrolling and padding it when
				    it's taller than the viewport. */}
				<_Dialog.Overlay dir={dir} className="tlui-dialog__overlay" />
				<div dir={dir} className="tlui-dialog__positioner">
					<_Dialog.Content
						dir={dir}
						className="tlui-dialog__content"
						aria-describedby={undefined}
						onInteractOutside={(e) => {
							// Radix's dismissable layers are layer-aware: an interaction outside the
							// topmost layer dismisses only that layer — an open select, or a dialog
							// stacked on top — leaving lower layers open. onInteractOutside fires for
							// both a pointer press and a focus shift outside the dialog; opt out of both
							// when the dialog asks to stay open on background interactions (escape still
							// closes it).
							if (preventBackgroundClose) {
								e.preventDefault()
							}
						}}
					>
						<ModalContent onClose={() => handleOpenChange(false)} />
					</_Dialog.Content>
				</div>
			</_Dialog.Portal>
		</_Dialog.Root>
	)
}

/** @public @react */
export const DefaultDialogs = memo(function DefaultDialogs() {
	const { dialogs } = useDialogs()
	const dialogsArray = useValue('dialogs', () => dialogs.get(), [dialogs])
	// Every stacked dialog stays modal (Radix's default). That's what keeps dismiss
	// layer-aware: a background press or escape closes only the topmost layer, because
	// Radix's focus-scope stack pauses lower dialogs rather than dismissing them. Don't
	// make a lower dialog non-modal to work around anything — without a focus scope it
	// dismisses on the focus shift when a nested dialog or select opens, collapsing the
	// whole stack.
	return dialogsArray.map((dialog) => <TldrawUiDialog key={dialog.id} {...dialog} />)
})
