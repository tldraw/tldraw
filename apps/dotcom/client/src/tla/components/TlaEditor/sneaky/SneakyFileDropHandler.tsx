import { useAuth } from '@clerk/clerk-react'
import { memo, useEffect } from 'react'
import { defaultHandleExternalFileContent, useEditor, useToasts, useTranslation } from 'tldraw'
import { useMaybeApp } from '../../../hooks/useAppState'
import { getSnapshotsFromDroppedTldrawFiles } from '../../../hooks/useTldrFileDrop'

export const SneakyTldrawFileDropHandler = memo(function SneakyTldrawFileDropHandler() {
	const editor = useEditor()
	const app = useMaybeApp()
	const auth = useAuth()
	const toasts = useToasts()
	const msg = useTranslation()
	useEffect(() => {
		if (!auth) return
		if (!app) return
		const defaultOnDrop = editor.externalContentHandlers['files']
		editor.registerExternalContentHandler('files', async (content) => {
			const { files } = content
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (tldrawFiles.length > 0) {
				const snapshots = await getSnapshotsFromDroppedTldrawFiles(editor, tldrawFiles)
				if (!snapshots.length) return
				const token = await auth.getToken()
				if (!token) return
				await app.createFilesFromTldrFiles(snapshots, token)
			} else {
				await defaultHandleExternalFileContent(editor, content, { toasts, msg })
			}
		})
	}, [editor, app, auth, toasts, msg])
	return null
})
