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
import { useApp } from '../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { defineMessages, F, useMsg } from '../../utils/i18n'
import styles from './dialogs.module.css'

const messages = defineMessages({
	title: { defaultMessage: 'Add file link' },
	label: { defaultMessage: 'File URL' },
	placeholder: { defaultMessage: 'Paste tldraw file URL...' },
	cancel: { defaultMessage: 'Cancel' },
	add: { defaultMessage: 'Add link' },
	invalidUrl: { defaultMessage: 'Invalid tldraw file URL' },
})

function extractFileIdFromUrl(url: string): string | null {
	try {
		const urlObj = new URL(url)
		// Match /f/:fileId pattern
		const match = urlObj.pathname.match(/^\/f\/([a-zA-Z0-9_-]+)/)
		return match ? match[1] : null
	} catch {
		return null
	}
}

export function AddFileLinkDialog({ onClose, groupId }: { onClose(): void; groupId: string }) {
	const app = useApp()
	const trackEvent = useTldrawAppUiEvents()
	const [fileUrl, setFileUrl] = useState('')
	const [error, setError] = useState(false)
	const placeholderMsg = useMsg(messages.placeholder)

	const handleAdd = async () => {
		const fileId = extractFileIdFromUrl(fileUrl)
		if (fileId) {
			await app.addFileLinkToGroup(fileId, groupId)
			trackEvent('add-file-link', { source: 'sidebar' })
			onClose()
		} else {
			setError(true)
		}
	}

	const handleValueChange = (value: string) => {
		setFileUrl(value)
		setError(false)
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
					<label htmlFor="file-url" style={{ display: 'block', marginBottom: 8 }}>
						<F {...messages.label} />
					</label>
					<TldrawUiInput
						className={styles.dialogInput}
						value={fileUrl}
						onValueChange={handleValueChange}
						onComplete={handleAdd}
						onCancel={onClose}
						placeholder={placeholderMsg}
						autoFocus
					/>
					{error && (
						<div style={{ color: 'var(--color-warn)', marginTop: 8, fontSize: 12 }}>
							<F {...messages.invalidUrl} />
						</div>
					)}
				</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<F {...messages.cancel} />
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={handleAdd}>
					<F {...messages.add} />
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
