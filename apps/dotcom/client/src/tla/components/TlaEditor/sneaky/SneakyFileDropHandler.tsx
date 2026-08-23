import { useAuth } from '@clerk/clerk-react'
import { memo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { defaultHandleExternalFileContent, useEditor, useToasts, useTranslation } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useMaybeApp } from '../../../hooks/useAppState'
import { useCurrentFileId } from '../../../hooks/useCurrentFileId'
import { useRejectTldrawOfflineFiles } from '../../../utils/tldrawOfflineFiles'

export const SneakyTldrawFileDropHandler = memo(function SneakyTldrawFileDropHandler() {
	const editor = useEditor()
	const app = useMaybeApp()
	const auth = useAuth()
	const toasts = useToasts()
	const msg = useTranslation()
	const navigate = useNavigate()
	const fileId = useCurrentFileId()
	const rejectTldrawOfflineFiles = useRejectTldrawOfflineFiles()
	useEffect(() => {
		if (!auth) return
		if (!app) return
		editor.registerExternalContentHandler('files', async (content) => {
			const files = rejectTldrawOfflineFiles(content.files)
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (tldrawFiles.length > 0) {
				const currentFile = fileId ? app.getFile(fileId) : null
				const workspaceId = currentFile?.owningGroupId ?? undefined
				await app.uploadTldrFiles(tldrawFiles, {
					source: 'file-drop',
					onFirstFileUploaded: (fileId) => {
						navigate(routes.tlaFile(fileId), { state: { mode: 'create' } })
					},
					workspaceId,
				})
			} else if (files.length > 0) {
				await defaultHandleExternalFileContent(editor, { ...content, files }, { toasts, msg })
			}
		})
	}, [editor, app, auth, toasts, msg, navigate, fileId, rejectTldrawOfflineFiles])
	return null
})
