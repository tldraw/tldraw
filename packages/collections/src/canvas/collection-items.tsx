import { type ButtonHTMLAttributes, type MouseEvent, useCallback } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonLabel,
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
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { type ItemOrdering, sortItems } from './item-order'
import { activeCollectionId, collectionsPanelOpen, expandedCollectionIds } from './state'

const messages = defineMessages({
	showAll: { id: 'collections.section.show-all', defaultMessage: 'Show all ({count})' },
	showLess: { id: 'collections.section.show-less', defaultMessage: 'Show less' },
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

/** Matches the columns of `.tlui-collections-grid`. */
const GRID_COLUMNS = 2

export interface CollectionItemsProps {
	source: CollectionSource
	collectionId: TLCollectionId
	/** Props for an item's tile button: its click and drag handlers. */
	getItemProps(itemId: TLCollectionItemId): ButtonHTMLAttributes<HTMLButtonElement>
	ordering: ItemOrdering
	reversed: boolean
	/** Shows this many rows of tiles, then a control that shows the rest. */
	maxRows: number
}

/** One collection's items as a grid, with each item's menu: rename, move and delete. */
export function CollectionItems({
	source,
	collectionId,
	getItemProps,
	ordering,
	reversed,
	maxRows,
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
	const canRename = useValue('can rename items', () => source.can('renameItem', collectionId), [
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
	const expanded = useValue(
		'collection expanded',
		() => expandedCollectionIds.get(editor).includes(collectionId),
		[editor, collectionId]
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

	const limit = maxRows * GRID_COLUMNS
	const truncates = items.length > limit
	const shownItems = truncates && !expanded ? items.slice(0, limit) : items
	const toggleExpanded = () =>
		expandedCollectionIds.update(editor, (ids) =>
			expanded ? ids.filter((id) => id !== collectionId) : [...ids, collectionId]
		)

	return (
		<>
			<ItemGrid
				items={shownItems.map((item) => ({
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
				empty={msg(messages.emptyCollection)}
			/>
			{truncates && (
				<div className="tlui-collections-section__more">
					<TldrawUiButton type="normal" aria-expanded={expanded} onClick={toggleExpanded}>
						<TldrawUiButtonLabel>
							{expanded ? msg(messages.showLess) : msg(messages.showAll, { count: items.length })}
						</TldrawUiButtonLabel>
					</TldrawUiButton>
				</div>
			)}
		</>
	)
}
