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
import { useEnvironment } from '../../providers/TlaEnvironmentProvider'
import { TldrawApp } from '../../utils/TldrawApp'
import { TldrawAppFileId } from '../../utils/schema/TldrawAppFile'
import styles from './dialogs.module.css'

export function TlaRenameFileDialog({
	fileId,
	onClose,
}: {
	fileId: TldrawAppFileId
	onClose(): void
}) {
	const app = useApp()
	const ref = useRef<HTMLInputElement>(null)
	const environment = useEnvironment()

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
				<TldrawUiDialogTitle>Rename file</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<TldrawUiInput
					ref={ref}
					className={styles.input}
					defaultValue={TldrawApp.getFileName(file)}
					isIos={environment.isIos}
					onComplete={handleSave}
					requestAnimationFrame={requestAnimationFrame}
					autoSelect
				/>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>Cancel</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={handleSave}>
					<TldrawUiButtonLabel>Save</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
