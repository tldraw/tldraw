import { memo, useEffect } from 'react'
import {
	defaultHandleExternalFileContent,
	parseAndLoadDocument,
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
} from 'tldraw'
import { useRejectTldrawOfflineFiles } from '../tla/utils/tldrawOfflineFiles'
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
	const rejectTldrawOfflineFiles = useRejectTldrawOfflineFiles()

	useEffect(() => {
		editor.registerExternalContentHandler('files', async (content) => {
			const files = rejectTldrawOfflineFiles(content.files)
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (tldrawFiles.length > 0) {
				if (isMultiplayer) {
					toasts.addToast({
						title: msg('file-system.shared-document-file-open-error.title'),
						description: msg('file-system.shared-document-file-open-error.description'),
						severity: 'error',
					})
				} else {
					const shouldOverride = await shouldOverrideDocument(dialogs.addDialog)
					if (!shouldOverride) return
					await parseAndLoadDocument(editor, await tldrawFiles[0].text(), msg, toasts.addToast)
				}
			} else if (files.length > 0) {
				await defaultHandleExternalFileContent(editor, { ...content, files }, { toasts, msg })
			}
		})
	}, [isMultiplayer, editor, toasts, msg, dialogs, rejectTldrawOfflineFiles])

	return null
})
