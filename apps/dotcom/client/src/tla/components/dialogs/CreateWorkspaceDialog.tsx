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
	title: { defaultMessage: 'Create workspace' },
	name: { defaultMessage: 'Name' },
	placeholder: { defaultMessage: 'Workspace name' },
	cancel: { defaultMessage: 'Cancel' },
	create: { defaultMessage: 'Create workspace' },
})

interface CreateWorkspaceDialogProps {
	onClose(): void
	onCreate(name: string): void
}

export function CreateWorkspaceDialog({ onClose, onCreate }: CreateWorkspaceDialogProps) {
	const [workspaceName, setWorkspaceName] = useState('')
	const placeholderMsg = useMsg(messages.placeholder)

	const handleCreate = () => {
		const trimmedName = workspaceName.trim()
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
						value={workspaceName}
						onValueChange={setWorkspaceName}
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
