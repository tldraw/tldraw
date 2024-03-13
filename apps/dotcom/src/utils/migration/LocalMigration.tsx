import { useEffect } from 'react'
import { useDialogs, useEditor, useToasts } from 'tldraw'
import { MigrationAnnouncement } from './MigrationAnnouncement'
import { importFromV1LocalRoom, isEditorEmpty } from './migration'

export function LocalMigration() {
	const editor = useEditor()
	const { addDialog } = useDialogs()
	const { addToast } = useToasts()

	useEffect(() => {
		let didCancel = false
		;(async () => {
			if (!isEditorEmpty(editor)) return

			const v1Result = await importFromV1LocalRoom(editor, () => didCancel)
			if (didCancel) return
			if (v1Result.didImport) {
				addDialog({
					component: ({ onClose }) => (
						<MigrationAnnouncement
							onClose={onClose}
							originalFile={{ name: 'New Document', document: v1Result.document }}
						/>
					),
				})
			}
		})()

		return () => {
			didCancel = true
		}
	}, [addDialog, addToast, editor])

	return null
}
