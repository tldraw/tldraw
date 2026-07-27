import { useAuth } from '@clerk/clerk-react'
import { memo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { defaultHandleExternalFileContent, useEditor, useToasts, useTranslation } from 'tldraw'
import { routes } from '../../../../routeDefs'
import {
	isTldrawOfflineFile,
	useNotifyTldrawOfflineFiles,
} from '../../../../utils/tldrawOfflineFiles'
import { useMaybeApp } from '../../../hooks/useAppState'
import { useCurrentFileId } from '../../../hooks/useCurrentFileId'

export const SneakyTldrawFileDropHandler = memo(function SneakyTldrawFileDropHandler() {
	const editor = useEditor()
	const app = useMaybeApp()
	const auth = useAuth()
	const toasts = useToasts()
	const msg = useTranslation()
	const navigate = useNavigate()
	const fileId = useCurrentFileId()
	const notifyTldrawOfflineFiles = useNotifyTldrawOfflineFiles()
	useEffect(() => {
		if (!auth) return
		if (!app) return
		editor.registerExternalContentHandler('files', async (content) => {
			notifyTldrawOfflineFiles(content.files)
			const files = content.files.filter((file) => !isTldrawOfflineFile(file))
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (tldrawFiles.length > 0) {
				const currentFile = fileId ? app.getFile(fileId) : null
				const workspaceId = currentFile?.owningGroupId ?? undefined
				await app.uploadTldrFiles(
					tldrawFiles,
					(fileId) => {
						navigate(routes.tlaFile(fileId), { state: { mode: 'create' } })
					},
					workspaceId
				)
			} else if (files.length > 0) {
				await defaultHandleExternalFileContent(editor, { ...content, files }, { toasts, msg })
			}
		})
	}, [editor, app, auth, toasts, msg, navigate, fileId, notifyTldrawOfflineFiles])
	return null
})
