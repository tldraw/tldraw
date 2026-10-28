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
	title: { id: 'collections.delete-dialog.title', defaultMessage: 'Delete collection' },
	body: {
		id: 'collections.delete-dialog.body',
		defaultMessage:
			'Delete “{name}” and its {count, plural, one {# item} other {# items}}? Copies already placed on canvases stay.',
	},
	cancel: { id: 'collections.delete-dialog.cancel', defaultMessage: 'Cancel' },
	confirm: { id: 'collections.delete-dialog.confirm', defaultMessage: 'Delete' },
})

export interface DeleteCollectionDialogProps {
	name: string
	itemCount: number
	onClose(): void
	onConfirm(): void
}

/** Asks before deleting a collection: unlike shapes, a deleted collection can't be undone. */
export function DeleteCollectionDialog({
	name,
	itemCount,
	onClose,
	onConfirm,
}: DeleteCollectionDialogProps) {
	const msg = useTranslation()

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{msg(messages.title)}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				{msg(messages.body, { name, count: itemCount })}
			</TldrawUiDialogBody>
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
