import { MAX_WORKSPACE_NAME_LENGTH } from '@tldraw/dotcom-shared'
import {
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiInput,
} from '@tldraw/ui'
import { useEffect, useRef, useState } from 'react'
import { defineMessages, F, useMsg } from '../../utils/i18n'
import styles from './dialogs.module.css'

const messages = defineMessages({
	defaultName: { defaultMessage: 'New workspace' },
	placeholder: { defaultMessage: 'Workspace name' },
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
					<F defaultMessage="Create a workspace" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350, paddingTop: 0 }}>
				<div>
					<div className={styles.dialogFieldLabelRow}>
						<label style={{ display: 'block' }}>
							<F defaultMessage="Name" />
						</label>
					</div>
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
					<F defaultMessage="Cancel" />
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={handleCreate}>
					<F defaultMessage="Create workspace" />
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
