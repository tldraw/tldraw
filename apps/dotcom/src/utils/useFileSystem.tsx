import {
	Editor,
	TLDRAW_FILE_EXTENSION,
	TLStore,
	TLUiActionItem,
	TLUiEventHandler,
	TLUiOverrides,
	assert,
	findMenuItem,
	menuGroup,
	menuItem,
	parseAndLoadDocument,
	serializeTldrawJsonBlob,
	transact,
} from '@tldraw/tldraw'
import { fileOpen, fileSave } from 'browser-fs-access'
import { useMemo } from 'react'
import { shouldClearDocument } from './shouldClearDocument'
import { shouldOverrideDocument } from './shouldOverrideDocument'
import { useHandleUiEvents } from './useHandleUiEvent'

const SAVE_FILE_COPY_ACTION = 'save-file-copy'
const OPEN_FILE_ACTION = 'open-file'
const NEW_PROJECT_ACTION = 'new-file'

const saveFileNames = new WeakMap<TLStore, string>()

export function useFileSystem({ isMultiplayer }: { isMultiplayer: boolean }): TLUiOverrides {
	const handleUiEvent = useHandleUiEvents()

	return useMemo((): TLUiOverrides => {
		return {
			actions(editor, actions, { addToast, msg, addDialog }) {
				actions[SAVE_FILE_COPY_ACTION] = getSaveFileCopyAction(editor, handleUiEvent)
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
				}
				return actions
			},
			menu(editor, menu, { actions }) {
				const fileMenu = findMenuItem(menu, ['menu', 'file'])
				assert(fileMenu.type === 'submenu')

				const saveItem = menuItem(actions[SAVE_FILE_COPY_ACTION])
				const openItem = menuItem(actions[OPEN_FILE_ACTION])
				const newItem = menuItem(actions[NEW_PROJECT_ACTION])
				const group = isMultiplayer
					? // open is not currently supported in multiplayer
						menuGroup('filesystem', saveItem)
					: menuGroup('filesystem', newItem, openItem, saveItem)
				fileMenu.children.unshift(group!)

				return menu
			},
			keyboardShortcutsMenu(editor, menu, { actions }) {
				const fileItems = findMenuItem(menu, ['shortcuts-dialog.file'])
				assert(fileItems.type === 'group')
				fileItems.children.unshift(menuItem(actions[SAVE_FILE_COPY_ACTION]))
				if (!isMultiplayer) {
					fileItems.children.unshift(menuItem(actions[OPEN_FILE_ACTION]))
				}

				return menu
			},
		}
	}, [isMultiplayer, handleUiEvent])
}

export function getSaveFileCopyAction(
	editor: Editor,
	handleUiEvent: TLUiEventHandler
): TLUiActionItem {
	return {
		id: SAVE_FILE_COPY_ACTION,
		label: 'action.save-copy',
		readonlyOk: true,
		kbd: '$s',
		async onSelect(source) {
			handleUiEvent('save-project-to-file', { source })
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
