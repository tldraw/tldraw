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
	copiedTitle: { id: 'libraries.copied.title', defaultMessage: 'Copied' },
	copiedDescription: { id: 'libraries.copied.description', defaultMessage: 'Copied to {name}.' },
	changeErrorTitle: {
		id: 'libraries.library-error.title',
		defaultMessage: "Couldn't change library",
	},
})

/**
 * A library's rename, delete and copy, as the source allows them, for its header and its
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

	const menuActions: Pick<LibraryMenuProps, 'onRename' | 'onDelete' | 'copy'> = {
		onRename: can.rename ? () => renamingLibraryId.set(editor, libraryId) : undefined,
		onDelete: can.delete ? deleteLibrary : undefined,
		copy: copyOwners.length > 0 ? { owners: copyOwners, onSelect: copyToOwner } : undefined,
	}

	return { isRenaming, onRenameComplete: renameLibrary, onRenameCancel: stopRenaming, menuActions }
}
