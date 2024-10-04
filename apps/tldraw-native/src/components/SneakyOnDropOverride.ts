import { useEffect } from 'react'
import { parseAndLoadDocument, useDefaultHelpers, useEditor } from 'tldraw'
import { shouldOverrideDocument } from '../utils/shouldOverrideDocument'

export function SneakyOnDropOverride({ isMultiplayer }: { isMultiplayer: boolean }) {
	const editor = useEditor()
	const { addDialog, msg, addToast } = useDefaultHelpers()

	useEffect(() => {
		const defaultOnDrop = editor.externalContentHandlers['files']
		editor.registerExternalContentHandler('files', async (content) => {
			const { files } = content
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (tldrawFiles.length > 0) {
				if (isMultiplayer) {
					addToast({
						title: msg('file-system.shared-document-file-open-error.title'),
						description: msg('file-system.shared-document-file-open-error.description'),
						severity: 'error',
					})
				} else {
					const shouldOverride = await shouldOverrideDocument(addDialog)
					if (!shouldOverride) return
					await parseAndLoadDocument(editor, await tldrawFiles[0].text(), msg, addToast)
				}
			} else {
				await defaultOnDrop?.(content)
			}
		})
	}, [isMultiplayer, editor, addToast, msg, addDialog])

	return null
}
