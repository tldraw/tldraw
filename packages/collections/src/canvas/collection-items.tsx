import { type ButtonHTMLAttributes, type MouseEvent, useCallback, useState } from 'react'
import { defineMessages, useDialogs, useEditor, useToasts, useTranslation, useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionId, TLCollectionItemId } from '../lib/schema'
import { ItemGrid } from '../ui/item-grid'
import { getItemMenuId, ItemMenu } from '../ui/item-menu'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'

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
	changeErrorDescription: {
		id: 'collections.change-error.description',
		defaultMessage:
			'You may not be allowed to change this collection, or the item no longer exists.',
	},
})

export interface CollectionItemsProps {
	source: CollectionSource
	collectionId: TLCollectionId
	/** Props for an item's tile button: its click and drag handlers. */
	getItemProps(itemId: TLCollectionItemId): ButtonHTMLAttributes<HTMLButtonElement>
}

/** One collection's items as a grid, with each item's rename and delete. */
export function CollectionItems({ source, collectionId, getItemProps }: CollectionItemsProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const items = useValue('collection items', () => source.getItems(collectionId), [
		source,
		collectionId,
	])
	const [renamingId, setRenamingId] = useState<TLCollectionItemId>()
	const canRename = useValue('can rename items', () => source.can('renameItem', collectionId), [
		source,
		collectionId,
	])
	const canDelete = useValue('can delete items', () => source.can('deleteItem', collectionId), [
		source,
		collectionId,
	])
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

	return (
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
					onRename={canRename ? () => setRenamingId(item.id) : undefined}
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
	)
}
