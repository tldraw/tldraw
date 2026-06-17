import { MAX_WORKSPACE_NAME_LENGTH } from '@tldraw/dotcom-shared'
import { useEffect, useRef, useState } from 'react'
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
	defaultName: { defaultMessage: 'New workspace' },
	placeholder: { defaultMessage: 'Workspace name' },
	cancel: { defaultMessage: 'Cancel' },
	create: { defaultMessage: 'Create workspace' },
})

interface CreateWorkspaceDialogProps {
	onClose(): void
	// The dialog closes immediately; failures are the handler's to surface (e.g. a toast).
	onCreate(name: string): void | Promise<void>
}

export function CreateWorkspaceDialog({ onClose, onCreate }: CreateWorkspaceDialogProps) {
	const defaultName = useMsg(messages.defaultName)
	const [workspaceName, setWorkspaceName] = useState(defaultName)
	const placeholderMsg = useMsg(messages.placeholder)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		// This dialog is opened from a Radix dropdown item. Native autoFocus can run
		// before the dropdown finishes closing and restores focus to its trigger.
		const timeout = window.setTimeout(() => {
			inputRef.current?.focus()
			inputRef.current?.select()
		}, 0)
		return () => window.clearTimeout(timeout)
	}, [])

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
					<label style={{ display: 'block', marginBottom: 8 }}>
						<F {...messages.name} />
					</label>
					<TldrawUiInput
						ref={inputRef}
						className={styles.dialogInput}
						value={workspaceName}
						onValueChange={setWorkspaceName}
						onComplete={handleCreate}
						onCancel={onClose}
						placeholder={placeholderMsg}
						maxLength={MAX_WORKSPACE_NAME_LENGTH}
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
