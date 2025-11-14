import { useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiInput,
} from 'tldraw'
import { defineMessages, F, useMsg } from '../../utils/i18n'
import styles from './dialogs.module.css'

const messages = defineMessages({
	title: { defaultMessage: 'Create group' },
	name: { defaultMessage: 'Name' },
	placeholder: { defaultMessage: 'Group name' },
	cancel: { defaultMessage: 'Cancel' },
	create: { defaultMessage: 'Create group' },
})

interface CreateGroupDialogProps {
	onClose(): void
	onCreate(name: string): void
}

export function CreateGroupDialog({ onClose, onCreate }: CreateGroupDialogProps) {
	const [groupName, setGroupName] = useState('')
	const placeholderMsg = useMsg(messages.placeholder)

	const handleCreate = () => {
		const trimmedName = groupName.trim()
		if (trimmedName) {
			onCreate(trimmedName)
			onClose()
		}
	}

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F {...messages.title} />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<div style={{ marginBottom: 16 }}>
					<label htmlFor="group-name" style={{ display: 'block', marginBottom: 8 }}>
						<F {...messages.name} />
					</label>
					<TldrawUiInput
						className={styles.dialogInput}
						value={groupName}
						onValueChange={setGroupName}
						onComplete={handleCreate}
						onCancel={onClose}
						placeholder={placeholderMsg}
						autoFocus
					/>
				</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<F {...messages.cancel} />
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={handleCreate}>
					<F {...messages.create} />
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
