import { Dialog as _Dialog } from '@base-ui/react/dialog'
import { useContainer, useValue } from '@tldraw/editor'
import { memo, useCallback } from 'react'
import { TLUiDialog, useDialogs } from '../context/dialogs'

/** @internal */
const TldrawUiDialog = ({ id, component: ModalContent, preventBackgroundClose }: TLUiDialog) => {
	const { removeDialog } = useDialogs()

	const container = useContainer()

	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				removeDialog(id)
			}
		},
		[id, removeDialog]
	)

	return (
		<_Dialog.Root
			onOpenChange={handleOpenChange}
			defaultOpen
			disablePointerDismissal={preventBackgroundClose}
		>
			<_Dialog.Portal container={container}>
				<_Dialog.Viewport className="tlui-dialog__overlay">
					<_Dialog.Popup className="tlui-dialog__content" aria-describedby={undefined}>
						<ModalContent
							onClose={() => {
								handleOpenChange(false)
							}}
						/>
					</_Dialog.Popup>
				</_Dialog.Viewport>
			</_Dialog.Portal>
		</_Dialog.Root>
	)
}

/** @public @react */
export const DefaultDialogs = memo(function DefaultDialogs() {
	const { dialogs } = useDialogs()
	const dialogsArray = useValue('dialogs', () => dialogs.get(), [dialogs])
	return dialogsArray.map((dialog) => <TldrawUiDialog key={dialog.id} {...dialog} />)
})
