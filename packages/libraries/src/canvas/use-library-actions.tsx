import {
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
	defineMessages,
	type TLLibrary,
} from 'tldraw'
import { copyLibrary } from '../lib/copyLibrary'
import type { LibrarySource } from '../lib/LibrarySource'
import type { LibraryMenuProps } from '../ui/library-menu'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { getContentTooNewToast } from './content-too-new-toast'
import { getOwnerChoices } from './owner-choices'
import {
	activeLibraryId,
	collapsedLibraryIds,
	librariesSearchScope,
	renamingLibraryId,
} from './state'

const messages = defineMessages({
	deleteTitle: {
		id: 'libraries.delete-library-dialog.title',
		defaultMessage: 'Delete library',
	},
	deleteBody: {
		id: 'libraries.delete-library-dialog.body',
		defaultMessage:
			'Delete “{name}” and its {count, plural, one {# item} other {# items}}? Copies already placed on canvases stay.',
	},
	deleteHousedBody: {
		id: 'libraries.delete-housed-library-dialog.body',
		defaultMessage:
			'“{name}” is kept in this file. Delete it and its {count, plural, one {# item} other {# items}} for everyone who opens the file? Copies already placed on canvases stay.',
	},
	removeTitle: {
		id: 'libraries.remove-library-dialog.title',
		defaultMessage: 'Remove from this file',
	},
	removeBody: {
		id: 'libraries.remove-library-dialog.body',
		defaultMessage:
			'Remove “{name}” from this file for everyone who opens it? Items already placed on the canvas stay, and the library stays available to add again.',
	},
	removeConfirm: { id: 'libraries.remove-library-dialog.confirm', defaultMessage: 'Remove' },
	movedTitle: { id: 'libraries.moved.title', defaultMessage: 'Moved' },
	movedDescription: { id: 'libraries.moved.description', defaultMessage: 'Moved to {name}.' },
	copiedTitle: { id: 'libraries.copied.title', defaultMessage: 'Copied' },
	copiedDescription: { id: 'libraries.copied.description', defaultMessage: 'Copied to {name}.' },
	changeErrorTitle: {
		id: 'libraries.library-error.title',
		defaultMessage: "Couldn't change libraries",
	},
	changeErrorDescription: {
		id: 'libraries.library-error.description',
		defaultMessage: 'You may not be allowed to, or the library no longer exists.',
	},
})

/** @public */
export interface LibraryActions {
	/** Whether the library's name is being edited: after `menuActions.onRename`, or once it's new. */
	isRenaming: boolean
	/** Ends renaming with a new name. A blank name, or the one it has, changes nothing. */
	onRenameComplete(name: string): void
	onRenameCancel(): void
	/**
	 * Props for a {@link LibraryMenu}: each action is left out when the source doesn't allow it.
	 * Deleting asks first in a dialog; moving and copying show a toast once done.
	 */
	menuActions: Pick<
		LibraryMenuProps,
		'onRename' | 'onDelete' | 'onRemoveFromDocument' | 'search' | 'move' | 'copy'
	>
}

/**
 * A library's rename, delete, removal from the document, search, move and copy, as the source
 * allows them, for its header and its menu, as each section of the {@link LibrariesPanel} uses
 * them. Renaming starts from the menu, or when the library is new, and ends with the header's
 * input. Failures show a toast.
 * @public
 */
export function useLibraryActions(source: LibrarySource, library: TLLibrary): LibraryActions {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const libraryId = library.id
	const isRenaming = useValue(
		'renaming library',
		() => renamingLibraryId.get(editor) === libraryId,
		[editor, libraryId]
	)
	const stopRenaming = () => renamingLibraryId.set(editor, null)
	const isSearchScope = useValue(
		'library is search scope',
		() => librariesSearchScope.get(editor) === libraryId,
		[editor, libraryId]
	)
	const searchInLibrary = () => {
		collapsedLibraryIds.update(editor, (ids) => ids.filter((id) => id !== libraryId))
		librariesSearchScope.set(editor, libraryId)
	}

	const can = useValue(
		'library permissions',
		() => {
			const canManage = source.can('deleteLibrary', libraryId)
			const placement = source.getLibraryPlacement
				? source.getLibraryPlacement(libraryId)
				: undefined
			return {
				rename: source.can('renameLibrary', libraryId),
				canManage,
				delete: canManage && placement !== 'added' && placement !== 'default',
				removeFromDocument:
					!!source.removeLibraryFromDocument && source.can('removeLibraryFromDocument', libraryId),
			}
		},
		[source, libraryId]
	)
	const ownerChoices = useValue(
		'library owner choices',
		() => getOwnerChoices(source, library.ownerId),
		[source, library.ownerId]
	)

	const showError = () =>
		addToast({
			title: msg(messages.changeErrorTitle),
			description: msg(messages.changeErrorDescription),
			severity: 'error',
		})

	const renameLibrary = (name: string) => {
		stopRenaming()
		const trimmed = name.trim()
		// Library names are never blank, so clearing the input keeps the old name.
		if (trimmed === '' || trimmed === library.name) return
		source.renameLibrary(libraryId, trimmed).catch(showError)
	}

	const deleteLibrary = () => {
		const count = source.getItems(libraryId).length
		const housed =
			source.getLibraryPlacement !== undefined && source.getLibraryPlacement(libraryId) === 'housed'
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDeleteDialog
					title={msg(messages.deleteTitle)}
					body={msg(housed ? messages.deleteHousedBody : messages.deleteBody, {
						name: library.name,
						count,
					})}
					onClose={onClose}
					onConfirm={() => source.deleteLibrary(libraryId).catch(showError)}
				/>
			),
		})
	}

	const removeFromDocument = () => {
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDeleteDialog
					title={msg(messages.removeTitle)}
					body={msg(messages.removeBody, { name: library.name })}
					confirmLabel={msg(messages.removeConfirm)}
					onClose={onClose}
					onConfirm={() => {
						if (source.removeLibraryFromDocument) {
							source.removeLibraryFromDocument(libraryId).catch(showError)
						}
					}}
				/>
			),
		})
	}

	const moveLibrary = (ownerId: string) => {
		if (!source.moveLibrary) return
		const owner = ownerChoices.move.find((o) => o.id === ownerId)
		source.moveLibrary(libraryId, ownerId).then((moved) => {
			activeLibraryId.set(editor, moved.id)
			addToast({
				title: msg(messages.movedTitle),
				description: owner && msg(messages.movedDescription, { name: owner.name }),
			})
		}, showError)
	}

	const copyToOwner = (ownerId: string) => {
		const owner = ownerChoices.copy.find((o) => o.id === ownerId)
		copyLibrary(source, libraryId, ownerId).then(
			(copy) => {
				activeLibraryId.set(editor, copy.id)
				addToast({
					title: msg(messages.copiedTitle),
					description: owner && msg(messages.copiedDescription, { name: owner.name }),
				})
			},
			(error) => {
				const tooNew = getContentTooNewToast(error, msg)
				if (tooNew) addToast(tooNew)
				else showError()
			}
		)
	}

	const menuActions: Pick<
		LibraryMenuProps,
		'onRename' | 'onDelete' | 'onRemoveFromDocument' | 'search' | 'move' | 'copy'
	> = {
		onRename: can.rename ? () => renamingLibraryId.set(editor, libraryId) : undefined,
		onDelete: can.delete ? deleteLibrary : undefined,
		onRemoveFromDocument: can.removeFromDocument ? removeFromDocument : undefined,
		search: isSearchScope ? undefined : { libraryName: library.name, onSelect: searchInLibrary },
		move:
			source.moveLibrary && can.canManage && ownerChoices.move.length > 0
				? { owners: ownerChoices.move, value: library.ownerId, onValueChange: moveLibrary }
				: undefined,
		copy:
			ownerChoices.copy.length > 0
				? { owners: ownerChoices.copy, onSelect: copyToOwner }
				: undefined,
	}

	return { isRenaming, onRenameComplete: renameLibrary, onRenameCancel: stopRenaming, menuActions }
}
