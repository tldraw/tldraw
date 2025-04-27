import { memo, useEffect } from 'react'
import {
	defaultHandleExternalFileContent,
	parseAndLoadDocument,
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
			} else {
				await defaultHandleExternalFileContent(editor, content, { toasts, msg })
			}
		})
	}, [isMultiplayer, editor, toasts, msg, dialogs])

	return null
})
