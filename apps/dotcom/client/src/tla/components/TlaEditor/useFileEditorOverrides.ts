import { fileSave } from 'browser-fs-access'
import { useMemo } from 'react'
import { TLDRAW_FILE_EXTENSION, TLStore, TLUiOverrides, serializeTldrawJsonBlob } from 'tldraw'
import { useHandleUiEvents } from '../../../utils/useHandleUiEvent'
import { useMaybeApp } from '../../hooks/useAppState'
import { useMsg } from '../../utils/i18n'
import { editorMessages as messages } from './editor-messages'

export function useFileEditorOverrides({ fileSlug }: { fileSlug?: string }) {
	const app = useMaybeApp()
	const handleUiEvent = useHandleUiEvents()
	const untitledProject = useMsg(messages.untitledProject)

	const overrides = useMemo<TLUiOverrides>(() => {
		if (!app) return {}

		return {
			actions(editor, actions) {
				actions['save-file-copy'] = {
					id: 'save-file-copy',
					label: 'action.save-copy',
					readonlyOk: true,
					kbd: '$s',
					async onSelect() {
						handleUiEvent('save-project-to-file', { source: '' })
						const documentName =
							((fileSlug ? app?.getFileName(fileSlug, false) : null) ??
								editor?.getDocumentSettings().name) ||
							// rather than displaying the date for the project here, display Untitled project
							untitledProject
						const defaultName =
							saveFileNames.get(editor.store) || `${documentName}${TLDRAW_FILE_EXTENSION}`

						const blobToSave = serializeTldrawJsonBlob(editor)
						let handle
						try {
							handle = await fileSave(blobToSave, {
								fileName: defaultName,
								extensions: [TLDRAW_FILE_EXTENSION],
								description: 'tldraw project',
							})
						} catch {
							// user cancelled
							return
						}

						if (handle) {
							// we deliberately don't store the handle for re-use
							// next time. we always want to save a copy, but to
							// help the user out we'll remember the last name
							// they used
							saveFileNames.set(editor.store, handle.name)
						}
					},
				}

				return actions
			},
		}
	}, [app, fileSlug, handleUiEvent, untitledProject])

	return overrides
}

// A map of previously saved tldr file names, so we can suggest the same name next time
const saveFileNames = new WeakMap<TLStore, string>()
