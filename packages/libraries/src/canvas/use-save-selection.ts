import { useCallback } from 'react'
import {
	defineMessages,
	getIncrementedName,
	useEditor,
	useToasts,
	useTranslation,
	type Editor,
	type TLLibraryId,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { createNewLibrary } from './new-library'
import { recordRecentLibrary } from './recent-libraries'
import { saveShapesToLibrary, type PrepareItemContent } from './save-shapes'
import { activeLibraryId, librariesPanelOpen, renamingLibraryId } from './state'

const messages = defineMessages({
	savedTitle: { id: 'libraries.saved.title', defaultMessage: 'Added to library' },
	savedDescription: { id: 'libraries.saved.description', defaultMessage: 'Added to {name}.' },
	savedOpen: { id: 'libraries.saved.open', defaultMessage: 'Open' },
	saveErrorTitle: {
		id: 'libraries.save-error.title',
		defaultMessage: "Couldn't save to library",
	},
	saveErrorDescription: {
		id: 'libraries.save-error.description',
		defaultMessage: 'You may not be allowed to add to this library, or it no longer exists.',
	},
	newLibraryName: { id: 'libraries.new-library-name', defaultMessage: 'New library' },
	newLibraryErrorTitle: {
		id: 'libraries.save-to-new-library-error.title',
		defaultMessage: "Couldn't add to a new library",
	},
	newLibraryErrorDescription: {
		id: 'libraries.save-to-new-library-error.description',
		defaultMessage: 'You may not be allowed to create libraries, or saving failed.',
	},
})

function showLibrary(editor: Editor, libraryId: TLLibraryId) {
	activeLibraryId.set(editor, libraryId)
	librariesPanelOpen.set(editor, true)
}

/**
 * Returns functions that save the current selection. `saveSelection` saves to an existing
 * library: with the panel open, the panel brings that library into view; otherwise a toast
 * confirms the save and can open it. `saveToNewLibrary` creates a library named "New
 * library" (or the next free variant), saves into it, and opens the panel with the new name
 * ready to edit. Failures show a toast.
 */
export function useSaveSelection(source: LibrarySource, prepareItemContent?: PrepareItemContent) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()

	const saveSelection = useCallback(
		(libraryId: TLLibraryId) => {
			const shapeIds = editor.getSelectedShapeIds()
			if (shapeIds.length === 0) return
			saveShapesToLibrary(editor, source, libraryId, shapeIds, { prepareItemContent }).then(
				() => {
					recordRecentLibrary(source.id, libraryId)
					if (librariesPanelOpen.get(editor)) {
						activeLibraryId.set(editor, libraryId)
						return
					}
					const library = source.getLibraries().find(({ id }) => id === libraryId)
					addToast({
						title: msg(messages.savedTitle),
						description: library
							? msg(messages.savedDescription, { name: library.name })
							: undefined,
						actions: [
							{
								label: msg(messages.savedOpen),
								type: 'primary',
								onClick: () => showLibrary(editor, libraryId),
							},
						],
					})
				},
				() => {
					addToast({
						title: msg(messages.saveErrorTitle),
						description: msg(messages.saveErrorDescription),
						severity: 'error',
					})
				}
			)
		},
		[editor, source, prepareItemContent, msg, addToast]
	)

	const saveToNewLibrary = useCallback(() => {
		const shapeIds = editor.getSelectedShapeIds()
		if (shapeIds.length === 0) return
		const name = getIncrementedName(
			msg(messages.newLibraryName),
			source.getLibraries().map((library) => library.name)
		)
		createNewLibrary(source, name)
			.then(async (library) => {
				await saveShapesToLibrary(editor, source, library.id, shapeIds, {
					prepareItemContent,
				})
				recordRecentLibrary(source.id, library.id)
				showLibrary(editor, library.id)
				renamingLibraryId.set(editor, library.id)
			})
			.catch(() => {
				addToast({
					title: msg(messages.newLibraryErrorTitle),
					description: msg(messages.newLibraryErrorDescription),
					severity: 'error',
				})
			})
	}, [editor, source, prepareItemContent, msg, addToast])

	return { saveSelection, saveToNewLibrary }
}
