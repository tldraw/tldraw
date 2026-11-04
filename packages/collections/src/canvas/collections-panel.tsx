import { type MouseEvent, useCallback, useState } from 'react'
import {
	defineMessages,
	EditorPortal,
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionId, TLCollectionItemId } from '../lib/schema'
import { ItemGrid } from '../ui/item-grid'
import { getItemMenuId, ItemMenu } from '../ui/item-menu'
import { CollectionsPanelHeader } from './collections-panel-header'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { getItemOrderChoice, itemOrderings, setItemOrderChoice, sortItems } from './item-order'
import { placeCollectionItem } from './place-item'
import { activeCollectionId, collectionsPanelOpen } from './state'
import { useItemDrag } from './use-item-drag'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
	empty: { id: 'collections.empty', defaultMessage: 'No collections yet.' },
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
	placeErrorTitle: { id: 'collections.place-error.title', defaultMessage: "Couldn't place item" },
	placeErrorDescription: {
		id: 'collections.place-error.description',
		defaultMessage: 'It may have been deleted. Try again, or pick another item.',
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

/** @public */
export interface CollectionsPanelProps {
	source: CollectionSource
	/** Which side of the canvas the panel floats on. Defaults to `'left'`. */
	side?: 'left' | 'right'
}

/**
 * A floating panel on one side of the canvas for browsing a {@link CollectionSource}, shown while
 * {@link collectionsPanelOpen} is set. Clicking an item places a copy of it in the middle of the
 * viewport; dragging one out drops it under the pointer.
 * @public @react
 */
export function CollectionsPanel({ source, side = 'left' }: CollectionsPanelProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const open = useValue('collections panel open', () => collectionsPanelOpen.get(editor), [editor])
	const collections = useValue('collections', () => source.getCollections(), [source])
	const activeId = useValue('active collection', () => activeCollectionId.get(editor), [editor])
	// A stale id (the collection was deleted) falls back to the first collection rather than an empty panel.
	const current = collections.find((collection) => collection.id === activeId) ?? collections[0]
	const currentId = current?.id
	const orderChoice = useValue('item order', () => getItemOrderChoice(source.id), [source])
	// A stored choice that matches no ordering falls back to the default.
	const ordering = itemOrderings.find((o) => o.id === orderChoice.orderingId) ?? itemOrderings[0]
	const items = useValue(
		'collection items',
		() => (currentId ? sortItems(source.getItems(currentId), ordering, orderChoice.reversed) : []),
		[source, currentId, ordering, orderChoice.reversed]
	)
	const sort = {
		options: itemOrderings.map(({ id, label }) => ({ id, label })),
		value: ordering.id,
		onValueChange: (orderingId: string) =>
			setItemOrderChoice(source.id, { ...orderChoice, orderingId }),
		reversed: orderChoice.reversed,
		onReversedChange: (reversed: boolean) =>
			setItemOrderChoice(source.id, { ...orderChoice, reversed }),
	}
	const placeItem = useCallback(
		(itemId: TLCollectionItemId) => {
			placeCollectionItem(editor, source, itemId).catch(() => {
				addToast({
					title: msg(messages.placeErrorTitle),
					description: msg(messages.placeErrorDescription),
					severity: 'error',
				})
			})
		},
		[editor, source, addToast, msg]
	)
	const getItemProps = useItemDrag(source, placeItem)
	const [renamingId, setRenamingId] = useState<TLCollectionItemId>()
	const canRename = useValue(
		'can rename items',
		() => currentId !== undefined && source.can('renameItem', currentId),
		[source, currentId]
	)
	const canDelete = useValue(
		'can delete items',
		() => currentId !== undefined && source.can('deleteItem', currentId),
		[source, currentId]
	)
	// Collections an item here can move to: other collections that accept items, when the source
	// can move and items may leave this one.
	const moveTargets = useValue(
		'move targets',
		() =>
			source.moveItem && currentId !== undefined && source.can('deleteItem', currentId)
				? source
						.getCollections()
						.filter((c) => c.id !== currentId && source.can('addItem', c.id))
						.map(({ id, name }) => ({ id, name }))
				: [],
		[source, currentId]
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
			const target = moveTargets.find((c) => c.id === toCollectionId)
			source.moveItem?.(itemId, toCollectionId).then(
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
			setRenamingId(undefined)
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

	if (!open) return null

	return (
		<EditorPortal>
			<section
				className="tlui-collections-panel"
				data-side={side}
				aria-label={msg(messages.title)}
				onContextMenu={(e) => e.stopPropagation()}
			>
				<CollectionsPanelHeader
					source={source}
					collections={collections}
					current={current}
					itemCount={items.length}
					sort={sort}
				/>
				{current ? (
					<ItemGrid
						items={items.map((item) => ({
							id: item.id,
							name: item.name,
							accessibleLabel: item.name ?? msg(messages.unnamedItem),
							thumbnailUrl: item.thumbnailUrl,
						}))}
						getItemProps={getTileProps}
						renderItemMenu={(item) => (
							<ItemMenu
								id={item.id}
								name={item.name}
								onRename={canRename ? () => setRenamingId(item.id) : undefined}
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
						renamingId={renamingId}
						onRename={renameItem}
						onCancelRename={() => setRenamingId(undefined)}
						empty={msg(messages.emptyCollection)}
					/>
				) : (
					<p className="tlui-collections-panel__empty">{msg(messages.empty)}</p>
				)}
			</section>
		</EditorPortal>
	)
}
