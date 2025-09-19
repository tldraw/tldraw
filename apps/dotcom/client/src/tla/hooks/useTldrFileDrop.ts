import { useAuth } from '@clerk/clerk-react'
import { DragEvent, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { tlmenus } from 'tldraw'
import { routes } from '../../routeDefs'
import { useApp } from './useAppState'

export function useTldrFileDrop() {
	const app = useApp()
	const navigate = useNavigate()

	const auth = useAuth()

	const onDrop = useCallback(
		async (e: DragEvent) => {
			const token = await auth.getToken()
			if (!token) {
				return
			}

			if (!e.dataTransfer?.files?.length) return
			const files = Array.from(e.dataTransfer.files)
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (!tldrawFiles.length) {
				return
			}
			app.uploadTldrFiles(tldrawFiles, (file) => {
				navigate(routes.tlaFile(file.id))
			})
		},
		[app, auth, navigate]
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
