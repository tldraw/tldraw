import { useContainer, useValue } from '@tldraw/editor'
import { Dialog as _Dialog } from 'radix-ui'
import { memo, useCallback, useRef } from 'react'
import { TLUiDialog, useDialogs } from '../context/dialogs'

/** @internal */
const TldrawUiDialog = ({
	id,
	component: ModalContent,
	onClose,
	preventBackgroundClose,
}: TLUiDialog) => {
	const { removeDialog } = useDialogs()
	const mouseDownInsideContentRef = useRef(false)

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
				<_Dialog.Overlay
					dir="ltr"
					className="tlui-dialog__overlay"
					onClick={(e) => {
						// We pressed mouse down inside the content of the dialog then moved the mouse
						// outside it and let go of the mouse button. This should not close the dialog.
						if (mouseDownInsideContentRef.current) return
						// only close if the click is on the overlay itself, ignore bubbling clicks
						if (!preventBackgroundClose && e.target === e.currentTarget) handleOpenChange(false)
					}}
				>
					<_Dialog.Content
						dir="ltr"
						className="tlui-dialog__content"
						aria-describedby={undefined}
						onMouseDown={() => (mouseDownInsideContentRef.current = true)}
						onMouseUp={() => (mouseDownInsideContentRef.current = false)}
						onInteractOutside={(e) => {
							mouseDownInsideContentRef.current = false
							if (preventBackgroundClose) {
								e.preventDefault()
							}
						}}
					>
						<ModalContent
							onClose={() => {
								mouseDownInsideContentRef.current = false
								handleOpenChange(false)
							}}
						/>
					</_Dialog.Content>
				</_Dialog.Overlay>
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
