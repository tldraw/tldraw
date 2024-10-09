import { DragEvent, useCallback, useState } from 'react'
import { Editor, TLStoreSnapshot, parseTldrawJsonFile, tlmenus, useToasts } from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'
import { useApp } from './useAppState'

export function useTldrFileDrop() {
	const app = useApp()

	const [isDraggingOver, setIsDraggingOver] = useState(false)

	const { addToast, removeToast } = useToasts()

	const onDrop = useCallback(
		async (e: DragEvent) => {
			setIsDraggingOver(false)

			if (!e.dataTransfer?.files?.length) return
			const files = Array.from(e.dataTransfer.files)
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (!tldrawFiles.length) {
				return
			}

			const editor = globalEditor.get()

			if (editor) {
				const snapshots = await getSnapshotsFromDroppedTldrawFiles(editor, tldrawFiles)
				if (!snapshots.length) return

				const id = addToast({
					severity: 'info',
					title: `Uploading .tldr file${snapshots.length > 1 ? 's' : ''}...`,
				})

				await app.createFilesFromTldrFiles(snapshots)

				removeToast(id)
				addToast({
					severity: 'success',
					title: `Added .tldr file${snapshots.length > 1 ? 's' : ''}`,
					keepOpen: true,
				})
			}
		},
		[app, addToast, removeToast]
	)

	const onDragOver = useCallback((e: DragEvent) => {
		e.preventDefault()
	}, [])

	const onDragEnter = useCallback(() => {
		setIsDraggingOver(true)
		tlmenus.hideOpenMenus()
	}, [])

	const onDragLeave = useCallback((e: DragEvent) => {
		if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as any)) {
			return
		}
		setIsDraggingOver(false)
		tlmenus.showOpenMenus()
	}, [])

	return { onDrop, onDragOver, onDragEnter, onDragLeave, isDraggingOver }
}

export async function getSnapshotsFromDroppedTldrawFiles(editor: Editor, tldrawFiles: File[]) {
	const { schema } = editor.store

	const results = await Promise.allSettled(
		tldrawFiles.map(async (file) => {
			const json = await file.text()
			const parseFileResult = parseTldrawJsonFile({
				schema,
				json,
			})

			if (parseFileResult.ok) {
				return parseFileResult.value.getStoreSnapshot()
			} else {
				console.error(parseFileResult.error)
			}

			return null
		})
	)

	const snapshots: TLStoreSnapshot[] = []

	for (const result of results) {
		if (result.status === 'fulfilled' && result.value !== null) {
			snapshots.push(result.value)
		}
	}

	return snapshots
}
