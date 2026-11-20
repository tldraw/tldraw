import { type ButtonHTMLAttributes, type MouseEvent, useCallback, useMemo } from 'react'
import {
	defineMessages,
	useDialogs,
	useEditor,
	useTranslation,
	useValue,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryItemId,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibraryItem } from '../lib/schema'
import { ItemGrid, ItemGridTile } from '../ui/item-grid'
import { ItemMenu as DefaultItemMenu, getItemMenuId } from '../ui/item-menu'
import { ItemTile as DefaultItemTile } from '../ui/item-tile'
import { AddSelectionTile as DefaultAddSelectionTile } from './add-selection-tile'
import { EmptyLibrary as DefaultEmptyLibrary } from './empty-library'
import { ItemDetailsDialog } from './item-details-dialog'
import type { TLLibraryItemOrdering } from './item-order'
import { useLibrariesComponentOverrides } from './libraries-components'
import { useLongPress, withHandlers } from './long-press'
import type { PrepareItemContent } from './save-shapes'
import { useIsPhone } from './use-is-phone'
import { useLibraryCan } from './use-library-can'
import { useLibraryItemActions } from './use-library-item-actions'
import { useLibraryItems } from './use-library-items'
import { useLibraryThumbnailUrls } from './use-library-thumbnail-urls'
import { useSaveSelectionToLibrary } from './use-save-selection-to-library'

const messages = defineMessages({
	noResults: { id: 'libraries.search.no-results', defaultMessage: 'No items found' },
	unnamedItem: { id: 'libraries.unnamed-item', defaultMessage: 'Unnamed item' },
})

export interface LibraryItemsProps {
	source: LibrarySource
	library: TLLibrary
	/** Where the tiles are measured for their thumbnail size. */
	container: HTMLElement | null
	getItemProps(itemId: TLLibraryItemId): ButtonHTMLAttributes<HTMLButtonElement>
	placeItem(itemId: TLLibraryItemId): void
	ordering: TLLibraryItemOrdering
	reversed: boolean
	/** Shows only the items it accepts, without the tile for adding the selection, as search does. */
	itemFilter?(item: TLLibraryItem): boolean
	prepareItemContent?: PrepareItemContent
}

export function LibraryItems({
	source,
	library,
	container,
	getItemProps,
	placeItem,
	ordering,
	reversed,
	itemFilter,
	prepareItemContent,
}: LibraryItemsProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const overrides = useLibrariesComponentOverrides()
	const {
		ItemTile = DefaultItemTile,
		ItemMenu = DefaultItemMenu,
		EmptyLibrary = DefaultEmptyLibrary,
		AddSelectionTile = DefaultAddSelectionTile,
	} = overrides
	const libraryId = library.id
	const listed = useLibraryItems(source, libraryId, { ordering, reversed })
	const items = useMemo(
		() => (itemFilter ? listed.filter(itemFilter) : listed),
		[listed, itemFilter]
	)
	const thumbnailUrls = useLibraryThumbnailUrls(source, items, { container })
	const canRename = useLibraryCan(source, 'updateItem', libraryId)
	const canAdd = useLibraryCan(source, 'addItem', libraryId) && !itemFilter
	const canDelete = useLibraryCan(source, 'deleteItem', libraryId)
	const { rename, move, copy, requestDelete, moveTargets, copyTargets } = useLibraryItemActions(
		source,
		libraryId
	)
	// Every item has Details, so it has a menu whatever the source allows.
	const hasItemMenu = ItemMenu !== null
	const getPressProps = useLongPress(useIsPhone())
	const getTileProps = useCallback(
		(itemId: TLLibraryItemId) => {
			const props = getItemProps(itemId)
			if (!hasItemMenu) return props
			const openMenu = () => editor.menus.addOpenMenu(getItemMenuId(itemId))
			return {
				...withHandlers(props, getPressProps(openMenu)),
				onContextMenu(e: MouseEvent<HTMLButtonElement>) {
					e.preventDefault()
					// macOS fires contextmenu on press. Opening then puts the menu under the pointer, and
					// releasing the button selects whichever item it lands on.
					if (e.buttons === 0) openMenu()
					else window.addEventListener('pointerup', openMenu, { once: true })
				},
			}
		},
		[getItemProps, hasItemMenu, editor, getPressProps]
	)
	const { saveSelection } = useSaveSelectionToLibrary(source, prepareItemContent)
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])

	if (items.length === 0 && !canAdd) {
		if (itemFilter) return <p className="tlui-libraries-panel__empty">{msg(messages.noResults)}</p>
		return EmptyLibrary && <EmptyLibrary library={library} />
	}

	const addSelectionTile = canAdd && AddSelectionTile && (
		<AddSelectionTile
			library={library}
			hasSelection={hasSelection}
			onAddSelection={() => saveSelection(libraryId)}
		/>
	)

	return (
		<>
			<ItemGrid>
				{ItemTile &&
					items.map((item) => (
						<ItemGridTile key={item.id}>
							<ItemTile
								item={item}
								name={item.name}
								accessibleLabel={item.name ?? msg(messages.unnamedItem)}
								thumbnailUrl={thumbnailUrls[item.id]}
								buttonProps={getTileProps(item.id)}
								menu={
									ItemMenu && (
										<ItemMenu
											item={item}
											id={item.id}
											name={item.name}
											onShowDetails={() =>
												addDialog({
													component: ({ onClose }) => (
														<ItemDetailsDialog
															source={source}
															item={item}
															library={library}
															onPlace={() => placeItem(item.id)}
															onClose={onClose}
														/>
													),
												})
											}
											onRename={canRename ? (name) => rename(item.id, name) : undefined}
											moveTargets={moveTargets}
											onMove={(toLibraryId) => move(item.id, toLibraryId as TLLibraryId)}
											copyTargets={copyTargets}
											onCopy={(toLibraryId) => copy(item.id, toLibraryId as TLLibraryId)}
											onDelete={canDelete ? () => requestDelete(item.id) : undefined}
										/>
									)
								}
							/>
						</ItemGridTile>
					))}
				{addSelectionTile && <ItemGridTile>{addSelectionTile}</ItemGridTile>}
			</ItemGrid>
		</>
	)
}
