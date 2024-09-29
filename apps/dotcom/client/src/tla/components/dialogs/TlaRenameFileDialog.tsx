import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useRef } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { TldrawAppFileId } from '../../utils/schema/TldrawAppFile'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaFormGroup, TlaFormInput, TlaFormItem, TlaFormLabel } from '../tla-form/tla-form'
import styles from './dialogs.module.css'

export function TlaRenameFileDialog({ fileId }: { fileId: TldrawAppFileId }) {
	const app = useApp()
	const ref = useRef<HTMLInputElement>(null)

	const fileName = useValue(
		'file name',
		() => {
			const file = app.store.get(fileId)
			if (!file) throw Error('expected a file')
			return file.name
		},
		[app]
	)

	const handleClose = useCallback(() => {
		// rename the file
		const file = app.store.get(fileId)
		if (!file) return
		const elm = ref.current
		if (!elm) return
		const name = elm.value.trim() || fileName
		app.store.put([{ ...file, name }])
	}, [app, fileId, fileName])

	return (
		<>
			<TlaFormGroup>
				<TlaFormItem>
					<Dialog.DialogTitle asChild>
						<TlaFormLabel>Rename file</TlaFormLabel>
					</Dialog.DialogTitle>
					<TlaFormInput ref={ref} defaultValue={fileName} />
				</TlaFormItem>
			</TlaFormGroup>
			<TlaFormGroup className={styles.actionGroup}>
				<Dialog.Close asChild>
					<TlaButton className={styles.actionButton} variant="secondary">
						Cancel
					</TlaButton>
				</Dialog.Close>
				<Dialog.Close asChild>
					<TlaButton className={styles.actionButton} onClick={handleClose}>
						Save
					</TlaButton>
				</Dialog.Close>
			</TlaFormGroup>
		</>
	)
}
