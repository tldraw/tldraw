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
	cancel: { id: 'collections.delete-dialog.cancel', defaultMessage: 'Cancel' },
	confirm: { id: 'collections.delete-dialog.confirm', defaultMessage: 'Delete' },
})

export interface ConfirmDeleteDialogProps {
	title: string
	body: string
	onClose(): void
	onConfirm(): void
}

/** Asks before deleting from a collection: unlike shapes, a deletion there can't be undone. */
export function ConfirmDeleteDialog({ title, body, onClose, onConfirm }: ConfirmDeleteDialogProps) {
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
					<TldrawUiButtonLabel>{msg(messages.confirm)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
