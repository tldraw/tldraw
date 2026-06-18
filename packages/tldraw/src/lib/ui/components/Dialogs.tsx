import { useContainer, useValue } from '@tldraw/editor'
import { Dialog as _Dialog } from 'radix-ui'
import { memo, useCallback, useRef } from 'react'
import { TLUiDialog, useDialogs } from '../context/dialogs'
import { useDirection } from '../hooks/useTranslation/useTranslation'

/** @internal */
const TldrawUiDialog = ({
	id,
	component: ModalContent,
	preventBackgroundClose,
	isModal,
}: TLUiDialog & { isModal: boolean }) => {
	const { removeDialog } = useDialogs()
	const mouseDownInsideContentRef = useRef(false)

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
		<_Dialog.Root onOpenChange={handleOpenChange} defaultOpen modal={isModal}>
			<_Dialog.Portal container={container}>
				<_Dialog.Overlay
					dir={dir}
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
						dir={dir}
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
	// Only the topmost dialog should be modal. Stacking multiple modal Radix
	// dialogs makes lower ones intercept pointer/touch events (via their own
	// focus traps and scroll-locking), which leaves a nested dialog unresponsive
	// to taps on mobile.
	return dialogsArray.map((dialog, i) => (
		<TldrawUiDialog key={dialog.id} {...dialog} isModal={i === dialogsArray.length - 1} />
	))
})
