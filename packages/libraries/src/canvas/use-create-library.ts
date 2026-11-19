import { useCallback } from 'react'
import { defineMessages, getIncrementedName, useEditor, useToasts, useTranslation } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { createNewLibrary } from './new-library'
import { activeLibraryId, renamingLibraryId } from './state'

const messages = defineMessages({
	newLibraryName: { id: 'libraries.new-library-name', defaultMessage: 'New library' },
	changeErrorTitle: {
		id: 'libraries.library-error.title',
		defaultMessage: "Couldn't change libraries",
	},
	changeErrorDescription: {
		id: 'libraries.library-error.description',
		defaultMessage: 'You may not be allowed to, or the library no longer exists.',
	},
})

/**
 * Creates a library with the next free "New library" name, then brings it into view with its name
 * ready to edit. Left without an `ownerId`, it goes to the source's default owner.
 */
export function useCreateLibrary(source: LibrarySource) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	return useCallback(
		(ownerId?: string) => {
			const name = getIncrementedName(
				msg(messages.newLibraryName),
				source.getLibraries().map((library) => library.name)
			)
			createNewLibrary(source, name, ownerId).then(
				(library) => {
					activeLibraryId.set(editor, library.id)
					renamingLibraryId.set(editor, library.id)
				},
				() =>
					addToast({
						title: msg(messages.changeErrorTitle),
						description: msg(messages.changeErrorDescription),
						severity: 'error',
					})
			)
		},
		[editor, source, msg, addToast]
	)
}
