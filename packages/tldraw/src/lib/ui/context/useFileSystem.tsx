import { Editor, TLStore, transact } from '@tldraw/editor'
import { fileOpen, fileSave } from 'browser-fs-access'
import { useMemo } from 'react'
import {
	TLDRAW_FILE_EXTENSION,
	parseAndLoadDocument,
	serializeTldrawJsonBlob,
} from '../../utils/tldr/file'
import { TLUiOverrides } from '../overrides'
import { TLUiActionItem } from './actions'
import { TLUiDialogsContextType } from './dialogs'
import { shouldClearDocument } from './shouldClearDocument'
import { shouldOverrideDocument } from './shouldOverrideDocument'
import { TLUiToastsContextType } from './toasts'

/** @public */
export const SAVE_FILE_COPY_ACTION = 'save-file-copy'
/** @public */
export const OPEN_FILE_ACTION = 'open-file'
/** @public */
export const NEW_PROJECT_ACTION = 'new-file'

const saveFileNames = new WeakMap<TLStore, string>()

/** @public */
export function useFileSystem({ isMultiplayer }: { isMultiplayer: boolean }): TLUiOverrides {
	return useMemo((): TLUiOverrides => {
		return {
			actions(editor, actions, { addDialog, msg, addToast }) {
				actions = {
					...actions,
					...getFileSystemActions(isMultiplayer, editor, addToast, msg, addDialog),
				}
				return actions
			},
		}
	}, [isMultiplayer])
}

/** @public */
export const getFileSystemActions = (
	isMultiplayer: boolean,
	editor: Editor,
	addToast: TLUiToastsContextType['addToast'],
	msg: (id?: string | undefined) => string,
	addDialog: TLUiDialogsContextType['addDialog']
) => ({
	[SAVE_FILE_COPY_ACTION]: getSaveFileCopyAction(editor),
	[OPEN_FILE_ACTION]: {
		id: OPEN_FILE_ACTION,
		label: 'action.open-file',
		readonlyOk: true,
		kbd: '$o',
		async onSelect() {
			// open in multiplayer is not currently supported
			if (isMultiplayer) {
				addToast({
					title: msg('file-system.shared-document-file-open-error.title'),
					description: msg('file-system.shared-document-file-open-error.description'),
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
			} catch (e) {
				// user cancelled
				return
			}

			await parseAndLoadDocument(editor, await file.text(), msg, addToast)
		},
	},
	[NEW_PROJECT_ACTION]: {
		id: NEW_PROJECT_ACTION,
		label: 'action.new-project',
		readonlyOk: true,
		async onSelect() {
			const shouldOverride = await shouldClearDocument(addDialog)
			if (!shouldOverride) return

			transact(() => {
				const isFocused = editor.getInstanceState().isFocused

				const bounds = editor.getViewportScreenBounds().clone()

				editor.store.clear()
				editor.store.ensureStoreIsUsable()
				editor.history.clear()
				// Put the old bounds back in place
				editor.updateViewportScreenBounds(bounds)
				editor.updateRenderingBounds()
				editor.updateInstanceState({ isFocused })
			})
		},
	},
})

/** @public */
export function getSaveFileCopyAction(editor: Editor): TLUiActionItem {
	return {
		id: SAVE_FILE_COPY_ACTION,
		label: 'action.save-copy',
		readonlyOk: true,
		kbd: '$s',
		async onSelect() {
			const defaultName = saveFileNames.get(editor.store) || `Untitled${TLDRAW_FILE_EXTENSION}`

			const blobToSave = serializeTldrawJsonBlob(editor.store)
			let handle
			try {
				handle = await fileSave(blobToSave, {
					fileName: defaultName,
					extensions: [TLDRAW_FILE_EXTENSION],
					description: 'tldraw project',
				})
			} catch (e) {
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
