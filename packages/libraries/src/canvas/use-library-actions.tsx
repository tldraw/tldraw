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
import { renamingLibraryId } from './state'

const messages = defineMessages({
	deleteTitle: {
		id: 'libraries.delete-library-dialog.title',
		defaultMessage: 'Delete library',
	},
	deleteBody: {
		id: 'libraries.delete-library-dialog.body',
		defaultMessage: 'Delete “{name}” and its {count, plural, one {# item} other {# items}}?',
	},
	movedTitle: { id: 'libraries.moved.title', defaultMessage: 'Moved' },
	movedDescription: { id: 'libraries.moved.description', defaultMessage: 'Moved to {name}.' },
	copiedTitle: { id: 'libraries.copied.title', defaultMessage: 'Copied' },
	copiedDescription: { id: 'libraries.copied.description', defaultMessage: 'Copied to {name}.' },
	changeErrorTitle: {
		id: 'libraries.library-error.title',
		defaultMessage: "Couldn't change library",
	},
})

/**
 * A library's rename, delete, move and copy, as the source allows them, for its header and its
 * menu. Renaming starts from the menu, or when the library is new, and ends with the header's
 * input.
 */
export function useLibraryActions(source: LibrarySource, library: TLLibrary) {
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
		() => ({
			rename: source.can('renameLibrary', libraryId),
			delete: source.can('deleteLibrary', libraryId),
		}),
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
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDeleteDialog
					title={msg(messages.deleteTitle)}
					body={msg(messages.deleteBody, { name: library.name, count })}
					onClose={onClose}
					onConfirm={() => source.deleteLibrary(libraryId).catch(showError)}
				/>
			),
		})
	}

	const moveLibrary = (ownerId: string) => {
		if (!source.moveLibrary) return
		const owner = ownerChoices.move.find((o) => o.id === ownerId)
		source.moveLibrary(libraryId, ownerId).then(
			() =>
				addToast({
					title: msg(messages.movedTitle),
					description: owner && msg(messages.movedDescription, { name: owner.name }),
				}),
			showError
		)
	}

	const copyToOwner = (ownerId: string) => {
		const owner = ownerChoices.copy.find((o) => o.id === ownerId)
		copyLibrary(source, libraryId, ownerId).then(
			() =>
				addToast({
					title: msg(messages.copiedTitle),
					description: owner && msg(messages.copiedDescription, { name: owner.name }),
				}),
			(error) => {
				const tooNew = getContentTooNewToast(error, msg)
				if (tooNew) addToast(tooNew)
				else showError()
			}
		)
	}

	const menuActions: Pick<LibraryMenuProps, 'onRename' | 'onDelete' | 'move' | 'copy'> = {
		onRename: can.rename ? () => renamingLibraryId.set(editor, libraryId) : undefined,
		onDelete: can.delete ? deleteLibrary : undefined,
		move:
			source.moveLibrary && can.delete && ownerChoices.move.length > 0
				? { owners: ownerChoices.move, value: library.ownerId, onValueChange: moveLibrary }
				: undefined,
		copy:
			ownerChoices.copy.length > 0
				? { owners: ownerChoices.copy, onSelect: copyToOwner }
				: undefined,
	}

	return { isRenaming, onRenameComplete: renameLibrary, onRenameCancel: stopRenaming, menuActions }
}
