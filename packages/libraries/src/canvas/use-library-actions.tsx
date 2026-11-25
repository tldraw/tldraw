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
import { getCopyOwners } from './copy-owners'
import { activeLibraryId, renamingLibraryId } from './state'

const messages = defineMessages({
	copyName: { id: 'libraries.copy-name', defaultMessage: '{name} (Copy)' },
	deleteTitle: {
		id: 'libraries.delete-library-dialog.title',
		defaultMessage: 'Delete library',
	},
	deleteBody: {
		id: 'libraries.delete-library-dialog.body',
		defaultMessage: 'Delete “{name}” and its {count, plural, one {# item} other {# items}}?',
	},
	deleteHousedBody: {
		id: 'libraries.delete-housed-library-dialog.body',
		defaultMessage:
			'Delete “{name}” and its {count, plural, one {# item} other {# items}} from this file?',
	},
	removeTitle: {
		id: 'libraries.remove-library-dialog.title',
		defaultMessage: 'Remove from this file',
	},
	removeBody: {
		id: 'libraries.remove-library-dialog.body',
		defaultMessage: 'Remove “{name}” from this file?',
	},
	removeConfirm: { id: 'libraries.remove-library-dialog.confirm', defaultMessage: 'Remove' },
	copiedTitle: { id: 'libraries.copied.title', defaultMessage: 'Copied' },
	copiedDescription: { id: 'libraries.copied.description', defaultMessage: 'Copied to {name}.' },
	changeErrorTitle: {
		id: 'libraries.library-error.title',
		defaultMessage: "Couldn't change library",
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
	 * Deleting asks first in a dialog; copying shows a toast once done.
	 */
	menuActions: Pick<LibraryMenuProps, 'onRename' | 'onDelete' | 'onRemoveFromDocument' | 'copy'>
}

/**
 * A library's rename, delete, removal from the document and copy, as the source allows them,
 * for its header and its menu, as each section of the {@link LibrariesPanel} uses them. Renaming
 * starts from the menu, or when the library is new, and ends with the header's input. Failures
 * show a toast.
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

	const can = useValue(
		'library permissions',
		() => {
			const placement = source.getLibraryPlacement
				? source.getLibraryPlacement(libraryId)
				: undefined
			return {
				rename: source.can('renameLibrary', libraryId),
				delete:
					source.can('deleteLibrary', libraryId) &&
					placement !== 'added' &&
					placement !== 'default',
				removeFromDocument:
					!!source.removeLibraryFromDocument && source.can('removeLibraryFromDocument', libraryId),
			}
		},
		[source, libraryId]
	)
	const copyOwners = useValue('library copy owners', () => getCopyOwners(source, library.ownerId), [
		source,
		library.ownerId,
	])

	const showError = () =>
		addToast({
			title: msg(messages.changeErrorTitle),
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

	const copyToOwner = (ownerId: string) => {
		const owner = copyOwners.find((o) => o.id === ownerId)
		copyLibrary(source, libraryId, ownerId, {
			getName: (name) => msg(messages.copyName, { name }),
		}).then(
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
		'onRename' | 'onDelete' | 'onRemoveFromDocument' | 'copy'
	> = {
		onRename: can.rename ? () => renamingLibraryId.set(editor, libraryId) : undefined,
		onDelete: can.delete ? deleteLibrary : undefined,
		onRemoveFromDocument: can.removeFromDocument ? removeFromDocument : undefined,
		copy: copyOwners.length > 0 ? { owners: copyOwners, onSelect: copyToOwner } : undefined,
	}

	return { isRenaming, onRenameComplete: renameLibrary, onRenameCancel: stopRenaming, menuActions }
}
