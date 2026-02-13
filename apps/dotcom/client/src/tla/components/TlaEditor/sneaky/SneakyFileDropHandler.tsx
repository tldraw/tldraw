import { useAuth } from '@clerk/clerk-react'
import { memo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { defaultHandleExternalFileContent, useEditor, useToasts, useTranslation } from 'tldraw'
import { routes } from '../../../../routeDefs'
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
	useEffect(() => {
		if (!auth) return
		if (!app) return
		editor.registerExternalContentHandler('files', async (content) => {
			const { files } = content
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (tldrawFiles.length > 0) {
				const currentFile = fileId ? app.getFile(fileId) : null
				const groupId = currentFile?.owningGroupId ?? undefined
				await app.uploadTldrFiles(
					tldrawFiles,
					(fileId) => {
						navigate(routes.tlaFile(fileId), { state: { mode: 'create' } })
					},
					groupId
				)
			} else {
				await defaultHandleExternalFileContent(editor, content, { toasts, msg })
			}
		})
	}, [editor, app, auth, toasts, msg, navigate, fileId])
	return null
})
