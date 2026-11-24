import { useCallback, useMemo } from 'react'
import {
	defineMessages,
	getIncrementedName,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { LibrariesPanelHeaderCreate } from './libraries-panel-header'
import { canCreateNewLibrary, createNewLibrary, getNewLibraryOwners } from './new-library'
import { activeLibraryId, renamingLibraryId } from './state'

const messages = defineMessages({
	newLibraryName: { id: 'libraries.new-library-name', defaultMessage: 'New library' },
	changeErrorTitle: {
		id: 'libraries.library-error.title',
		defaultMessage: "Couldn't change library",
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
						severity: 'error',
					})
			)
		},
		[editor, source, msg, addToast]
	)
}

/**
 * Where the user can create a library and {@link useCreateLibrary}'s create, for a "Create library"
 * item or button. Undefined when the source allows creating none.
 */
export function useLibraryCreate(source: LibrarySource): LibrariesPanelHeaderCreate | undefined {
	const createLibrary = useCreateLibrary(source)
	const owners = useValue(
		'new library owners',
		() => {
			const owners = getNewLibraryOwners(source)
			if (owners.length > 0) return owners
			return canCreateNewLibrary(source) ? [] : undefined
		},
		[source]
	)
	return useMemo(() => owners && { owners, onCreate: createLibrary }, [owners, createLibrary])
}
