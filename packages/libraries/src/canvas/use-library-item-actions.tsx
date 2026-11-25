import { useCallback } from 'react'
import {
	defineMessages,
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
	type TLLibraryId,
	type TLLibraryItemId,
} from 'tldraw'
import { copyItem } from '../lib/copyLibrary'
import type { LibrarySource } from '../lib/LibrarySource'
import type { LibraryMenuTarget } from '../ui/menu-items'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { getContentTooNewToast } from './content-too-new-toast'
import { getLibraryMenuTargets } from './menu-targets'
import { activeLibraryId, librariesPanelOpen } from './state'

const messages = defineMessages({
	copyName: { id: 'libraries.copy-name', defaultMessage: '{name} (Copy)' },
	deleteItemTitle: { id: 'libraries.delete-item-dialog.title', defaultMessage: 'Delete item' },
	deleteItemBody: {
		id: 'libraries.delete-item-dialog.body',
		defaultMessage: 'Delete “{name}” from “{library}”?',
	},
	deleteUnnamedItemBody: {
		id: 'libraries.delete-unnamed-item-dialog.body',
		defaultMessage: 'Delete this item from “{library}”?',
	},
	renameErrorTitle: {
		id: 'libraries.rename-error.title',
		defaultMessage: "Couldn't rename item",
	},
	deleteErrorTitle: {
		id: 'libraries.delete-error.title',
		defaultMessage: "Couldn't delete item",
	},
	movedTitle: { id: 'libraries.moved.title', defaultMessage: 'Moved' },
	movedDescription: { id: 'libraries.moved.description', defaultMessage: 'Moved to {name}.' },
	movedOpen: { id: 'libraries.moved.open', defaultMessage: 'Open' },
	moveErrorTitle: { id: 'libraries.move-error.title', defaultMessage: "Couldn't move item" },
	copiedTitle: { id: 'libraries.copied.title', defaultMessage: 'Copied' },
	copiedDescription: { id: 'libraries.copied.description', defaultMessage: 'Copied to {name}.' },
	copyErrorTitle: { id: 'libraries.copy-error.title', defaultMessage: "Couldn't copy item" },
})

/** @public */
export interface LibraryItemActions {
	/**
	 * Renames an item. The name is trimmed; a blank name, or the one it has, changes nothing, since
	 * names are never blank.
	 */
	rename(itemId: TLLibraryItemId, name: string): void
	/**
	 * Moves an item to one of {@link LibraryItemActions.moveTargets}, then shows a toast. Resolves
	 * to the item's id in the library it joins, or undefined if it couldn't move.
	 */
	move(itemId: TLLibraryItemId, toLibraryId: TLLibraryId): Promise<TLLibraryItemId | undefined>
	/** Copies an item to one of {@link LibraryItemActions.copyTargets}, then shows a toast. */
	copy(itemId: TLLibraryItemId, toLibraryId: TLLibraryId): void
	/** Asks the user to confirm in a dialog, then deletes the item. */
	requestDelete(itemId: TLLibraryItemId): void
	/**
	 * The libraries the source's items may move to: those they may be copied to, when the source
	 * can move items and they may leave this library. Empty otherwise.
	 */
	moveTargets: LibraryMenuTarget[]
	/** The source's other libraries the user may add items to, in the panel's order. */
	copyTargets: LibraryMenuTarget[]
}

/**
 * Rename, move, copy and delete for a library's items, as the panel's item menu offers them.
 * Failures show a toast, a move or copy shows one that can open the library it went to, and
 * deleting asks first in a dialog. Check {@link useLibraryCan} with `'updateItem'` and
 * `'deleteItem'` before offering a rename or a delete.
 * @public
 */
export function useLibraryItemActions(
	source: LibrarySource,
	libraryId: TLLibraryId
): LibraryItemActions {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const copyTargets = useValue(
		'copy targets',
		() =>
			getLibraryMenuTargets(
				source,
				source.getLibraries().filter((c) => c.id !== libraryId && source.can('addItem', c.id))
			),
		[source, libraryId]
	)
	// Items may move only where they may be copied, and only when they may leave this library.
	const moveTargets = useValue(
		'move targets',
		() => (source.moveItem && source.can('deleteItem', libraryId) ? copyTargets : []),
		[source, libraryId, copyTargets]
	)
	const getItem = useCallback(
		(itemId: TLLibraryItemId) => source.getItems(libraryId).find((i) => i.id === itemId),
		[source, libraryId]
	)
	const showChangeError = useCallback(
		(title: string) => {
			addToast({ title, severity: 'error' })
		},
		[addToast]
	)
	const showDone = useCallback(
		(title: string, description: string | undefined, toLibraryId: TLLibraryId) => {
			addToast({
				title,
				description,
				actions: [
					{
						label: msg(messages.movedOpen),
						type: 'primary',
						onClick: () => {
							activeLibraryId.set(editor, toLibraryId)
							librariesPanelOpen.set(editor, true)
						},
					},
				],
			})
		},
		[editor, addToast, msg]
	)
	const move = useCallback(
		(itemId: TLLibraryItemId, toLibraryId: TLLibraryId) => {
			if (!source.moveItem) return Promise.resolve(undefined)
			const target = moveTargets.find((c) => c.id === toLibraryId)
			return source.moveItem(itemId, toLibraryId).then(
				(movedId) => {
					showDone(
						msg(messages.movedTitle),
						target ? msg(messages.movedDescription, { name: target.name }) : undefined,
						toLibraryId
					)
					return movedId
				},
				() => {
					showChangeError(msg(messages.moveErrorTitle))
					return undefined
				}
			)
		},
		[source, moveTargets, msg, showDone, showChangeError]
	)
	const copy = useCallback(
		(itemId: TLLibraryItemId, toLibraryId: TLLibraryId) => {
			const item = getItem(itemId)
			if (!item) return
			const target = copyTargets.find((c) => c.id === toLibraryId)
			copyItem(source, item, source, toLibraryId, {
				getName: (name) => msg(messages.copyName, { name }),
			}).then(
				() =>
					showDone(
						msg(messages.copiedTitle),
						target ? msg(messages.copiedDescription, { name: target.name }) : undefined,
						toLibraryId
					),
				(error) => {
					const tooNew = getContentTooNewToast(error, msg)
					if (tooNew) addToast(tooNew)
					else showChangeError(msg(messages.copyErrorTitle))
				}
			)
		},
		[source, getItem, copyTargets, addToast, msg, showDone, showChangeError]
	)
	const rename = useCallback(
		(itemId: TLLibraryItemId, name: string) => {
			const item = getItem(itemId)
			const trimmed = name.trim()
			// Names are never blank, so clearing the input keeps the old name rather than removing it.
			if (!item || trimmed === '' || trimmed === item.name) return
			source
				.updateItem(itemId, { name: trimmed })
				.catch(() => showChangeError(msg(messages.renameErrorTitle)))
		},
		[getItem, source, showChangeError, msg]
	)
	const requestDelete = useCallback(
		(itemId: TLLibraryItemId) => {
			const item = getItem(itemId)
			if (!item) return
			const library = source.getLibraries().find((c) => c.id === libraryId)?.name ?? ''
			addDialog({
				component: ({ onClose }) => (
					<ConfirmDeleteDialog
						title={msg(messages.deleteItemTitle)}
						body={
							item.name
								? msg(messages.deleteItemBody, { name: item.name, library })
								: msg(messages.deleteUnnamedItemBody, { library })
						}
						onClose={onClose}
						onConfirm={() =>
							source.deleteItem(itemId).catch(() => showChangeError(msg(messages.deleteErrorTitle)))
						}
					/>
				),
			})
		},
		[getItem, addDialog, msg, source, libraryId, showChangeError]
	)
	return { rename, move, copy, requestDelete, moveTargets, copyTargets }
}
