import { type ButtonHTMLAttributes, type MouseEvent, useCallback } from 'react'
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
import type { LibrarySource } from '../lib/LibrarySource'
import { ItemGrid, ItemGridItems, ItemGridTile } from '../ui/item-grid'
import { getItemMenuId, ItemMenu } from '../ui/item-menu'
import { AddSelectionTile } from './add-selection-tile'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { type ItemOrdering, sortItems } from './item-order'
import type { PrepareItemContent } from './save-shapes'
import { activeLibraryId, librariesPanelOpen } from './state'
import { useThumbnailUrls } from './use-thumbnail-urls'

const messages = defineMessages({
	emptyLibrary: {
		id: 'libraries.empty-library',
		defaultMessage: 'Nothing saved here yet.',
	},
	unnamedItem: { id: 'libraries.unnamed-item', defaultMessage: 'Unnamed item' },
	deleteItemTitle: { id: 'libraries.delete-item-dialog.title', defaultMessage: 'Delete item' },
	deleteItemBody: {
		id: 'libraries.delete-item-dialog.body',
		defaultMessage: 'Delete “{name}” from this library? Copies already placed on canvases stay.',
	},
	deleteUnnamedItemBody: {
		id: 'libraries.delete-unnamed-item-dialog.body',
		defaultMessage: 'Delete this item from this library? Copies already placed on canvases stay.',
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
	changeErrorDescription: {
		id: 'libraries.change-error.description',
		defaultMessage: 'You may not be allowed to change this library, or the item no longer exists.',
	},
})

export interface LibraryItemsProps {
	source: LibrarySource
	libraryId: TLLibraryId
	/** Where the tiles are measured for their thumbnail size. */
	container: HTMLElement | null
	getItemProps(itemId: TLLibraryItemId): ButtonHTMLAttributes<HTMLButtonElement>
	ordering: ItemOrdering
	reversed: boolean
	prepareItemContent?: PrepareItemContent
}

export function LibraryItems({
	source,
	libraryId,
	container,
	getItemProps,
	ordering,
	reversed,
	prepareItemContent,
}: LibraryItemsProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const items = useValue(
		'library items',
		() => sortItems(source.getItems(libraryId), ordering, reversed),
		[source, libraryId, ordering, reversed]
	)
	const thumbnailUrls = useThumbnailUrls(source, items, container)
	const canRename = useValue('can rename items', () => source.can('renameItem', libraryId), [
		source,
		libraryId,
	])
	const canAdd = useValue('can add items', () => source.can('addItem', libraryId), [
		source,
		libraryId,
	])
	const canDelete = useValue('can delete items', () => source.can('deleteItem', libraryId), [
		source,
		libraryId,
	])
	// Libraries an item here can move to: other libraries that accept items, when the source
	// can move and items may leave this one.
	const moveTargets = useValue(
		'move targets',
		() =>
			source.moveItem && source.can('deleteItem', libraryId)
				? source
						.getLibraries()
						.filter((c) => c.id !== libraryId && source.can('addItem', c.id))
						.map(({ id, name }) => ({ id, name }))
				: [],
		[source, libraryId]
	)
	const getTileProps = useCallback(
		(itemId: TLLibraryItemId) => {
			const props = getItemProps(itemId)
			if (!canRename && !canDelete) return props
			return {
				...props,
				onContextMenu(e: MouseEvent<HTMLButtonElement>) {
					e.preventDefault()
					const openMenu = () => editor.menus.addOpenMenu(getItemMenuId(itemId))
					// macOS fires contextmenu on press. Opening then puts the menu under the pointer, and
					// releasing the button selects whichever item it lands on.
					if (e.buttons === 0) openMenu()
					else window.addEventListener('pointerup', openMenu, { once: true })
				},
			}
		},
		[getItemProps, canRename, canDelete, editor]
	)
	const showChangeError = useCallback(
		(title: string) => {
			addToast({ title, description: msg(messages.changeErrorDescription), severity: 'error' })
		},
		[addToast, msg]
	)
	const moveItem = useCallback(
		(itemId: TLLibraryItemId, toLibraryId: TLLibraryId) => {
			if (!source.moveItem) return
			const target = moveTargets.find((c) => c.id === toLibraryId)
			source.moveItem(itemId, toLibraryId).then(
				() => {
					addToast({
						title: msg(messages.movedTitle),
						description: target ? msg(messages.movedDescription, { name: target.name }) : undefined,
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
				() => showChangeError(msg(messages.moveErrorTitle))
			)
		},
		[editor, source, moveTargets, addToast, msg, showChangeError]
	)
	const renameItem = useCallback(
		(itemId: TLLibraryItemId, name: string) => {
			const item = items.find((i) => i.id === itemId)
			const trimmed = name.trim()
			// Names are never blank, so clearing the input keeps the old name rather than removing it.
			if (!item || trimmed === '' || trimmed === item.name) return
			source
				.renameItem(itemId, trimmed)
				.catch(() => showChangeError(msg(messages.renameErrorTitle)))
		},
		[items, source, showChangeError, msg]
	)

	if (items.length === 0 && !canAdd) {
		return <p className="tlui-libraries-panel__empty">{msg(messages.emptyLibrary)}</p>
	}

	return (
		<ItemGrid>
			<ItemGridItems
				items={items.map((item) => ({
					id: item.id,
					name: item.name,
					accessibleLabel: item.name ?? msg(messages.unnamedItem),
					thumbnailUrl: thumbnailUrls[item.id] ?? undefined,
				}))}
				getItemProps={getTileProps}
				renderItemMenu={(item) => (
					<ItemMenu
						id={item.id}
						name={item.name}
						onRename={canRename ? (name) => renameItem(item.id, name) : undefined}
						moveTargets={moveTargets}
						onMove={(toLibraryId) => moveItem(item.id, toLibraryId as TLLibraryId)}
						onDelete={
							canDelete
								? () =>
										addDialog({
											component: ({ onClose }) => (
												<ConfirmDeleteDialog
													title={msg(messages.deleteItemTitle)}
													body={
														item.name
															? msg(messages.deleteItemBody, { name: item.name })
															: msg(messages.deleteUnnamedItemBody)
													}
													onClose={onClose}
													onConfirm={() =>
														source
															.deleteItem(item.id)
															.catch(() => showChangeError(msg(messages.deleteErrorTitle)))
													}
												/>
											),
										})
								: undefined
						}
					/>
				)}
			/>
			{canAdd && (
				<ItemGridTile>
					<AddSelectionTile
						source={source}
						libraryId={libraryId}
						prepareItemContent={prepareItemContent}
					/>
				</ItemGridTile>
			)}
		</ItemGrid>
	)
}
