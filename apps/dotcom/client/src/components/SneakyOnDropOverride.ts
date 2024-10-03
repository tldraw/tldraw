import { useEffect } from 'react'
import {
	parseAndLoadDocument,
	preventDefault,
	useContainer,
	useDefaultHelpers,
	useEditor,
} from 'tldraw'
import { shouldOverrideDocument } from '../utils/shouldOverrideDocument'

export function SneakyOnDropOverride({ isMultiplayer }: { isMultiplayer: boolean }) {
	const editor = useEditor()
	const { addDialog, msg, addToast } = useDefaultHelpers()

	const container = useContainer()

	useEffect(() => {
		if (!container) return

		function onDrop(e: DragEvent) {
			preventDefault(e)
			const cvs = container.querySelector('.tl-canvas')
			const newEvent = new DragEvent('drop', e)
			cvs?.dispatchEvent(newEvent)
		}

		container.addEventListener('dragover', onDrop)
		container.addEventListener('drop', onDrop)
		return () => {
			container.removeEventListener('dragover', onDrop)
			container.removeEventListener('drop', onDrop)
		}
	}, [container])

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
