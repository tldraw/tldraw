import { useAuth } from '@clerk/clerk-react'
import { DragEvent, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { tlmenus } from 'tldraw'
import { routes } from '../../routeDefs'
import { useRejectTldrawOfflineFiles } from '../utils/tldrawOfflineFiles'
import { useApp } from './useAppState'

export function useTldrFileDrop() {
	const app = useApp()
	const navigate = useNavigate()

	const auth = useAuth()
	const rejectTldrawOfflineFiles = useRejectTldrawOfflineFiles()

	const onDrop = useCallback(
		async (e: DragEvent) => {
			// Read the file list before any await: the DataTransfer is neutered once the drop event
			// finishes dispatching, so reading it after the token fetch finds it empty.
			const droppedFiles = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : []
			if (!droppedFiles.length) return

			const token = await auth.getToken()
			if (!token) {
				return
			}

			const files = rejectTldrawOfflineFiles(droppedFiles)
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (!tldrawFiles.length) {
				return
			}
			app.uploadTldrFiles(tldrawFiles, {
				source: 'file-drop',
				onFirstFileUploaded: (fileId) => {
					navigate(routes.tlaFile(fileId))
				},
			})
		},
		[app, auth, navigate, rejectTldrawOfflineFiles]
	)

	const onDragOver = useCallback((e: DragEvent) => {
		e.preventDefault()
	}, [])

	const onDragEnter = useCallback(() => {
		tlmenus.hideOpenMenus()
	}, [])

	const onDragLeave = useCallback((e: DragEvent) => {
		if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as any)) {
			return
		}
		tlmenus.showOpenMenus()
	}, [])

	return { onDrop, onDragOver, onDragEnter, onDragLeave }
}
