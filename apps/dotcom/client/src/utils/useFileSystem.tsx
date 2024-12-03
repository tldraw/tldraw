import { fileOpen, fileSave } from 'browser-fs-access'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	Editor,
	TLDRAW_FILE_EXTENSION,
	TLStore,
	TLUiActionItem,
	TLUiEventHandler,
	TLUiOverrides,
	parseAndLoadDocument,
	serializeTldrawJsonBlob,
	transact,
} from 'tldraw'
import { shouldClearDocument } from './shouldClearDocument'
import { shouldOverrideDocument } from './shouldOverrideDocument'
import { useHandleUiEvents } from './useHandleUiEvent'

export const SAVE_FILE_COPY_ACTION = 'save-file-copy'
export const OPEN_FILE_ACTION = 'open-file'
export const NEW_PROJECT_ACTION = 'new-file'
export const NEW_SHARED_PROJECT_ACTION = 'new-shared-file'

const saveFileNames = new WeakMap<TLStore, string>()

export function useFileSystem({ isMultiplayer }: { isMultiplayer: boolean }): TLUiOverrides {
	const handleUiEvent = useHandleUiEvents()
	const navigate = useNavigate()

	return useMemo((): TLUiOverrides => {
		return {
			actions(editor, actions, { addToast, msg, addDialog }) {
				actions[SAVE_FILE_COPY_ACTION] = getSaveFileCopyAction(
					editor,
					handleUiEvent,
					msg('document.default-name')
				)
				actions[OPEN_FILE_ACTION] = {
					id: OPEN_FILE_ACTION,
					label: 'action.open-file',
					readonlyOk: true,
					kbd: '$o',
					async onSelect(source) {
						handleUiEvent('open-file', { source })
						// open in multiplayer is not currently supported
						if (isMultiplayer) {
							addToast({
								title: msg('file-system.shared-document-file-open-error.title'),
								description: msg('file-system.shared-document-file-open-error.description'),
								severity: 'error',
							})
							return
						}

						const shouldOverride = await shouldOverrideDocument(addDialog)
						if (!shouldOverride) return

						let file
						try {
							file = await fileOpen({
								extensions: [TLDRAW_FILE_EXTENSION],
								multiple: false,
								description: 'tldraw project',
							})
						} catch {
							// user cancelled
							return
						}

						await parseAndLoadDocument(editor, await file.text(), msg, addToast)
					},
				}
				actions[NEW_SHARED_PROJECT_ACTION] = {
					id: NEW_SHARED_PROJECT_ACTION,
					label: 'action.new-shared-project',
					readonlyOk: true,
					async onSelect(source) {
						handleUiEvent('create-new-shared-project', { source })
						navigate('/new')
					},
				}
				actions[NEW_PROJECT_ACTION] = {
					id: NEW_PROJECT_ACTION,
					label: 'action.new-project',
					readonlyOk: true,
					async onSelect(source) {
						handleUiEvent('create-new-project', { source })
						const shouldOverride = await shouldClearDocument(addDialog)
						if (!shouldOverride) return
						transact(() => {
							editor.loadSnapshot({ store: {}, schema: editor.store.schema.serialize() })
							editor.clearHistory()
						})
					},
				}
				return actions
			},
		}
	}, [handleUiEvent, isMultiplayer, navigate])
}

export function getSaveFileCopyAction(
	editor: Editor,
	handleUiEvent: TLUiEventHandler,
	defaultDocumentName: string
): TLUiActionItem {
	return {
		id: SAVE_FILE_COPY_ACTION,
		label: 'action.save-copy',
		readonlyOk: true,
		kbd: '$s',
		async onSelect(source) {
			handleUiEvent('save-project-to-file', { source })
			const documentName =
				editor.getDocumentSettings().name === ''
					? defaultDocumentName
					: editor.getDocumentSettings().name
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
}
