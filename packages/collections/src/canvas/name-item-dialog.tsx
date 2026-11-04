import { useState } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiInput,
	useTranslation,
} from 'tldraw'

const messages = defineMessages({
	title: { id: 'collections.name-item-dialog.title', defaultMessage: 'Name this item' },
	cancel: { id: 'collections.name-item-dialog.cancel', defaultMessage: 'Cancel' },
	save: { id: 'collections.name-item-dialog.save', defaultMessage: 'Save' },
	placeholder: { id: 'collections.name-item-dialog.placeholder', defaultMessage: 'Name' },
})

export interface NameItemDialogProps {
	onClose(): void
	/** Called with the trimmed name, or undefined when it was left blank. */
	onSave(name: string | undefined): void
}

/** Asks for an item's name before saving it. Cancelling saves nothing. */
export function NameItemDialog({ onClose, onSave }: NameItemDialogProps) {
	const msg = useTranslation()
	const [name, setName] = useState('')
	const save = () => {
		const trimmed = name.trim()
		onSave(trimmed === '' ? undefined : trimmed)
		onClose()
	}

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{msg(messages.title)}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<TldrawUiInput
					className="tlui-collections-name-input"
					defaultValue=""
					placeholder={msg(messages.placeholder)}
					autoFocus
					onValueChange={setName}
					onComplete={save}
					onCancel={onClose}
				/>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>{msg(messages.cancel)}</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={save}>
					<TldrawUiButtonLabel>{msg(messages.save)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
