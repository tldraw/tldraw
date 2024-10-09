import { tx } from '@instantdb/core'
import { useCallback, useRef } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiInput,
} from 'tldraw'
import { useDbFile } from '../../hooks/db-hooks'
import { useRaw } from '../../hooks/useRaw'
import { db } from '../../utils/db'
import { TldrawAppFile } from '../../utils/db-schema'
import styles from './dialogs.module.css'

export function TlaRenameFileDialog({
	fileId,
	onClose,
}: {
	fileId: TldrawAppFile['id']
	onClose(): void
}) {
	const raw = useRaw()
	const ref = useRef<HTMLInputElement>(null)

	const file = useDbFile(fileId)

	const handleSave = useCallback(() => {
		// rename the file
		const elm = ref.current
		if (!elm) return
		const name = elm.value.slice(0, 312).trim()

		if (name) {
			// Only update the name if there is a name there to update
			db.transact([tx.files[fileId].merge({ name })])
		}

		onClose()
	}, [fileId, onClose])

	if (!file) return null

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{raw('Rename file')}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<TldrawUiInput
					ref={ref}
					className={styles.input}
					defaultValue={file.name}
					onComplete={handleSave}
					autoSelect
					autoFocus
				/>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>{raw('Cancel')}</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={handleSave}>
					<TldrawUiButtonLabel>{raw('Save')}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
