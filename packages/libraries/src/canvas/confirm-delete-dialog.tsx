import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useTranslation,
} from 'tldraw'

const messages = defineMessages({
	cancel: { id: 'libraries.delete-dialog.cancel', defaultMessage: 'Cancel' },
	confirm: { id: 'libraries.delete-dialog.confirm', defaultMessage: 'Delete' },
})

export interface ConfirmDeleteDialogProps {
	title: string
	body: string
	/** Defaults to "Delete". */
	confirmLabel?: string
	onClose(): void
	onConfirm(): void
}

/**
 * Asks before deleting from a library, which unlike deleting shapes can't be undone, or before
 * removing a library from a file, which removes it for everyone who opens the file.
 */
export function ConfirmDeleteDialog({
	title,
	body,
	confirmLabel,
	onClose,
	onConfirm,
}: ConfirmDeleteDialogProps) {
	const msg = useTranslation()

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{title}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>{body}</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>{msg(messages.cancel)}</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton
					type="danger"
					onClick={() => {
						onConfirm()
						onClose()
					}}
				>
					<TldrawUiButtonLabel>{confirmLabel ?? msg(messages.confirm)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
