import { DragEvent, useCallback } from 'react'
import { Editor, TLStoreSnapshot, parseTldrawJsonFile } from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'
import { useApp } from './useAppState'

export function useTldrFileDrop() {
	const app = useApp()

	const onDrop = useCallback(
		async (e: DragEvent) => {
			if (!e.dataTransfer?.files?.length) return
			const files = Array.from(e.dataTransfer.files)
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (!tldrawFiles.length) return

			const editor = globalEditor.get()

			if (editor) {
				const snapshots = await handleDroppedTldrawFiles(editor, tldrawFiles)
				if (!snapshots.length) return
				await app.createFilesFromTldrFiles(snapshots)
			}
		},
		[app]
	)

	return { onDrop, onDragOver: onDrop }
}

export async function handleDroppedTldrawFiles(editor: Editor, tldrawFiles: File[]) {
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
