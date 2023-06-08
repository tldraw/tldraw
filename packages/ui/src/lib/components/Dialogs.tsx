import * as _Dialog from '@radix-ui/react-dialog'
import { useContainer } from '@tldraw/editor'
import React, { useCallback } from 'react'
import { TLUiDialog, useDialogs } from '../hooks/useDialogsProvider'

const Dialog = ({ id, component: ModalContent, onClose }: TLUiDialog) => {
	const { removeDialog } = useDialogs()

	const container = useContainer()

	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				if (onClose) {
					try {
						onClose()
					} catch (err: any) {
						console.warn(err)
					}
				}
				removeDialog(id)
			}
		},
		[id, onClose, removeDialog]
	)

	return (
		<_Dialog.Root onOpenChange={handleOpenChange} defaultOpen>
			<_Dialog.Portal container={container}>
				<_Dialog.Overlay dir="ltr" className="tlui-dialog__overlay">
					<_Dialog.Content dir="ltr" className="tlui-dialog__content">
						<ModalContent onClose={() => handleOpenChange(false)} />
					</_Dialog.Content>
				</_Dialog.Overlay>
			</_Dialog.Portal>
		</_Dialog.Root>
	)
}

function _Dialogs() {
	const { dialogs } = useDialogs()

	return (
		<>
			{dialogs.map((dialog: TLUiDialog) => (
				<Dialog key={dialog.id} {...dialog} />
			))}
		</>
	)
}

export const Dialogs = React.memo(_Dialogs)
