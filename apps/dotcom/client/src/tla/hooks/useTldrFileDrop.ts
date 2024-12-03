import { useAuth } from '@clerk/clerk-react'
import { DragEvent, useCallback, useState } from 'react'
import { Editor, TLStoreSnapshot, parseTldrawJsonFile, tlmenus, useToasts } from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'
import { defineMessages, useIntl } from '../utils/i18n'
import { useApp } from './useAppState'

const messages = defineMessages({
	uploading: { defaultMessage: 'Uploading .tldr {count, plural, one {# file} other {# files}}…' },
	adding: { defaultMessage: 'Added .tldr {count, plural, one {# file} other {# files}}' },
})

export function useTldrFileDrop() {
	const app = useApp()

	const [isDraggingOver, setIsDraggingOver] = useState(false)

	const { addToast, removeToast } = useToasts()

	const auth = useAuth()
	const intl = useIntl()

	const onDrop = useCallback(
		async (e: DragEvent) => {
			setIsDraggingOver(false)

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

			const editor = globalEditor.get()

			if (editor) {
				const snapshots = await getSnapshotsFromDroppedTldrawFiles(editor, tldrawFiles)
				if (!snapshots.length) return

				const uploadingTitle = intl.formatMessage(messages.uploading, {
					count: snapshots.length,
				})
				const addedTitle = intl.formatMessage(messages.adding, { count: snapshots.length })

				const id = addToast({
					severity: 'info',
					title: uploadingTitle,
				})

				await app.createFilesFromTldrFiles(snapshots, token)

				removeToast(id)
				addToast({
					severity: 'success',
					title: addedTitle,
					keepOpen: true,
				})
			}
		},
		[app, addToast, removeToast, auth, intl]
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
