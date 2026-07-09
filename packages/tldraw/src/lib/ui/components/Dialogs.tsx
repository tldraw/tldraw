import { useValue } from '@tldraw/editor'
import { TldrawUiDialogRoot } from '@tldraw/ui'
import { memo, useCallback } from 'react'
import { TLUiDialog, useDialogs } from '../context/dialogs'

/** @internal */
const TldrawUiDialog = ({ id, component: ModalContent, preventBackgroundClose }: TLUiDialog) => {
	const { removeDialog } = useDialogs()

	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				removeDialog(id)
			}
		},
		[id, removeDialog]
	)

	return (
		<TldrawUiDialogRoot
			defaultOpen
			onOpenChange={handleOpenChange}
			preventBackgroundClose={preventBackgroundClose}
		>
			<ModalContent onClose={() => handleOpenChange(false)} />
		</TldrawUiDialogRoot>
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
