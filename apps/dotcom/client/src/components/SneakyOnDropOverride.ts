import { memo, useEffect } from 'react'
import {
	OCIF_FILE_EXTENSION,
	TLDRAW_FILE_EXTENSION,
	defaultHandleExternalFileContent,
	parseAndLoadDocument,
	parseAndLoadOcifFile,
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
} from 'tldraw'
import { shouldOverrideDocument } from '../utils/shouldOverrideDocument'

export const SneakyOnDropOverride = memo(function SneakyOnDropOverride({
	isMultiplayer,
}: {
	isMultiplayer: boolean
}) {
	const editor = useEditor()
	const toasts = useToasts()
	const dialogs = useDialogs()
	const msg = useTranslation()

	useEffect(() => {
		editor.registerExternalContentHandler('files', async (content) => {
			const { files } = content
			const tldrawCompatibleFiles = files.filter(
				(file) =>
					file.name.endsWith(TLDRAW_FILE_EXTENSION) || file.name.endsWith(OCIF_FILE_EXTENSION)
			)
			if (tldrawCompatibleFiles.length > 0) {
				if (isMultiplayer) {
					toasts.addToast({
						title: msg('file-system.shared-document-file-open-error.title'),
						description: msg('file-system.shared-document-file-open-error.description'),
						severity: 'error',
					})
				} else {
					const shouldOverride = await shouldOverrideDocument(dialogs.addDialog)
					if (!shouldOverride) return
					if (tldrawCompatibleFiles[0].name.endsWith(TLDRAW_FILE_EXTENSION)) {
						await parseAndLoadDocument(
							editor,
							await tldrawCompatibleFiles[0].text(),
							msg,
							toasts.addToast
						)
					} else {
						await parseAndLoadOcifFile(
							editor,
							await tldrawCompatibleFiles[0].text(),
							msg,
							toasts.addToast
						)
					}
				}
			} else {
				await defaultHandleExternalFileContent(editor, content, { toasts, msg })
			}
		})
	}, [isMultiplayer, editor, toasts, msg, dialogs])

	return null
})
