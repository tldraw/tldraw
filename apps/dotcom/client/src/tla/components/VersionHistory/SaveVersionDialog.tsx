import { useEffect, useRef, useState } from 'react'
import {
	F,
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiInput,
	useTranslation,
} from 'tldraw'
import { versionHistoryMessages as messages } from './version-history-messages'
import styles from '../dialogs/dialogs.module.css'

const MAX_VERSION_NAME_LENGTH = 100

/** Same layout as CreateWorkspaceDialog. */
export function SaveVersionDialog({
	onClose,
	onSave,
}: {
	onClose(): void
	onSave(name: string): void | Promise<void>
}) {
	const msg = useTranslation()
	const [name, setName] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		// Opened from a header button; focus after the click settles.
		const timeout = window.setTimeout(() => inputRef.current?.focus(), 0)
		return () => window.clearTimeout(timeout)
	}, [])

	const handleSave = () => {
		const trimmed = name.trim()
		if (!trimmed) return
		onSave(trimmed)
		onClose()
	}

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F {...messages.saveVersion} />
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
						value={name}
						onValueChange={setName}
						onComplete={handleSave}
						onCancel={onClose}
						placeholder={msg(messages.versionNamePlaceholder)}
						maxLength={MAX_VERSION_NAME_LENGTH}
						autoFocus
					/>
				</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<F defaultMessage="Cancel" />
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={handleSave} disabled={!name.trim()}>
					<F defaultMessage="Save" />
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
