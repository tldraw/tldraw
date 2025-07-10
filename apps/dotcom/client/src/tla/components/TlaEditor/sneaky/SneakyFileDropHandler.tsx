import { useAuth } from '@clerk/clerk-react'
import { memo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	OCIF_FILE_EXTENSION,
	TLDRAW_FILE_EXTENSION,
	defaultHandleExternalFileContent,
	useEditor,
	useToasts,
	useTranslation,
} from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useMaybeApp } from '../../../hooks/useAppState'

export const SneakyTldrawFileDropHandler = memo(function SneakyTldrawFileDropHandler() {
	const editor = useEditor()
	const app = useMaybeApp()
	const auth = useAuth()
	const toasts = useToasts()
	const msg = useTranslation()
	const navigate = useNavigate()
	useEffect(() => {
		if (!auth) return
		if (!app) return
		editor.registerExternalContentHandler('files', async (content) => {
			const { files } = content
			const tldrawCompatibleFiles = files.filter(
				(file) =>
					file.name.endsWith(TLDRAW_FILE_EXTENSION) || file.name.endsWith(OCIF_FILE_EXTENSION)
			)
			if (tldrawCompatibleFiles.length > 0) {
				await app.uploadTldrCompatibleFiles(tldrawCompatibleFiles, (file) => {
					navigate(routes.tlaFile(file.id), { state: { mode: 'create' } })
				})
			} else {
				await defaultHandleExternalFileContent(editor, content, { toasts, msg })
			}
		})
	}, [editor, app, auth, toasts, msg, navigate])
	return null
})
