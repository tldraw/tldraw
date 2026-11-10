import { type ButtonHTMLAttributes, type MouseEvent, useCallback } from 'react'
import { defineMessages, useDialogs, useEditor, useToasts, useTranslation, useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionId, TLCollectionItemId } from '../lib/schema'
import { ItemGrid, ItemGridItems, ItemGridTile } from '../ui/item-grid'
import { getItemMenuId, ItemMenu } from '../ui/item-menu'
import { AddSelectionTile } from './add-selection-tile'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { type ItemOrdering, sortItems } from './item-order'
import { activeCollectionId, collectionsPanelOpen } from './state'
import { useThumbnailUrls } from './use-thumbnail-urls'

const messages = defineMessages({
	emptyCollection: {
		id: 'collections.empty-collection',
		defaultMessage: 'Nothing saved here yet.',
	},
	unnamedItem: { id: 'collections.unnamed-item', defaultMessage: 'Unnamed item' },
	deleteItemTitle: { id: 'collections.delete-item-dialog.title', defaultMessage: 'Delete item' },
	deleteItemBody: {
		id: 'collections.delete-item-dialog.body',
		defaultMessage: 'Delete “{name}” from this collection? Copies already placed on canvases stay.',
	},
	deleteUnnamedItemBody: {
		id: 'collections.delete-unnamed-item-dialog.body',
		defaultMessage:
			'Delete this item from this collection? Copies already placed on canvases stay.',
	},
	renameErrorTitle: {
		id: 'collections.rename-error.title',
		defaultMessage: "Couldn't rename item",
	},
	deleteErrorTitle: {
		id: 'collections.delete-error.title',
		defaultMessage: "Couldn't delete item",
	},
	movedTitle: { id: 'collections.moved.title', defaultMessage: 'Moved' },
	movedDescription: { id: 'collections.moved.description', defaultMessage: 'Moved to {name}.' },
	movedOpen: { id: 'collections.moved.open', defaultMessage: 'Open' },
	moveErrorTitle: { id: 'collections.move-error.title', defaultMessage: "Couldn't move item" },
	changeErrorDescription: {
		id: 'collections.change-error.description',
		defaultMessage:
			'You may not be allowed to change this collection, or the item no longer exists.',
	},
})

export interface CollectionItemsProps {
	source: CollectionSource
	collectionId: TLCollectionId
	/** Where the tiles are measured for their thumbnail size. */
	container: HTMLElement | null
	getItemProps(itemId: TLCollectionItemId): ButtonHTMLAttributes<HTMLButtonElement>
	ordering: ItemOrdering
	reversed: boolean
}

export function CollectionItems({
	source,
	collectionId,
	container,
	getItemProps,
	ordering,
	reversed,
}: CollectionItemsProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const items = useValue(
		'collection items',
		() => sortItems(source.getItems(collectionId), ordering, reversed),
		[source, collectionId, ordering, reversed]
	)
	const thumbnailUrls = useThumbnailUrls(source, items, container)
	const canRename = useValue('can rename items', () => source.can('renameItem', collectionId), [
		source,
		collectionId,
	])
	const canAdd = useValue('can add items', () => source.can('addItem', collectionId), [
		source,
		collectionId,
	])
	const canDelete = useValue('can delete items', () => source.can('deleteItem', collectionId), [
		source,
		collectionId,
	])
	// Collections an item here can move to: other collections that accept items, when the source
	// can move and items may leave this one.
	const moveTargets = useValue(
		'move targets',
		() =>
			source.moveItem && source.can('deleteItem', collectionId)
				? source
						.getCollections()
						.filter((c) => c.id !== collectionId && source.can('addItem', c.id))
						.map(({ id, name }) => ({ id, name }))
				: [],
		[source, collectionId]
	)
	const getTileProps = useCallback(
		(itemId: TLCollectionItemId) => {
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
		(itemId: TLCollectionItemId, toCollectionId: TLCollectionId) => {
			if (!source.moveItem) return
			const target = moveTargets.find((c) => c.id === toCollectionId)
			source.moveItem(itemId, toCollectionId).then(
				() => {
					addToast({
						title: msg(messages.movedTitle),
						description: target ? msg(messages.movedDescription, { name: target.name }) : undefined,
						actions: [
							{
								label: msg(messages.movedOpen),
								type: 'primary',
								onClick: () => {
									activeCollectionId.set(editor, toCollectionId)
									collectionsPanelOpen.set(editor, true)
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
		(itemId: TLCollectionItemId, name: string) => {
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
		return <p className="tlui-collections-panel__empty">{msg(messages.emptyCollection)}</p>
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
						onMove={(toCollectionId) => moveItem(item.id, toCollectionId as TLCollectionId)}
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
					<AddSelectionTile source={source} collectionId={collectionId} />
				</ItemGridTile>
			)}
		</ItemGrid>
	)
}
