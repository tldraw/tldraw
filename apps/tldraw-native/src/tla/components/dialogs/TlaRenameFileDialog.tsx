import { TldrawAppFileId } from '@tldraw/dotcom-shared'
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
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
import { TldrawApp } from '../../utils/TldrawApp'
import styles from './dialogs.module.css'

export function TlaRenameFileDialog({
	fileId,
	onClose,
}: {
	fileId: TldrawAppFileId
	onClose(): void
}) {
	const app = useApp()
	const raw = useRaw()
	const ref = useRef<HTMLInputElement>(null)

	const file = useValue(
		'file',
		() => {
			const file = app.store.get(fileId)
			if (!file) throw Error('expected a file')
			return file
		},
		[app]
	)

	const handleSave = useCallback(() => {
		// rename the file
		const file = app.store.get(fileId)
		if (!file) return
		const elm = ref.current
		if (!elm) return
		const name = elm.value.slice(0, 312).trim()

		if (name) {
			// Only update the name if there is a name there to update
			app.store.put([{ ...file, name }])
		}

		onClose()
	}, [app, fileId, onClose])

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
					defaultValue={TldrawApp.getFileName(file)}
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
