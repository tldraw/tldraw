import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { useEditor } from 'tldraw'
import { useMaybeApp } from '../../../hooks/useAppState'
import { getSnapshotsFromDroppedTldrawFiles } from '../../../hooks/useTldrFileDrop'

export function SneakyTldrawFileDropHandler() {
	const editor = useEditor()
	const app = useMaybeApp()
	const auth = useAuth()
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
				defaultOnDrop?.(content)
			}
		})
	}, [editor, app, auth])
	return null
}
