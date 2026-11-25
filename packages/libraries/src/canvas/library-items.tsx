import { type ButtonHTMLAttributes, type MouseEvent, useCallback } from 'react'
import {
	defineMessages,
	useEditor,
	useTranslation,
	useValue,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryItemId,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { ItemGrid, ItemGridTile } from '../ui/item-grid'
import { ItemMenu as DefaultItemMenu, getItemMenuId } from '../ui/item-menu'
import { ItemTile as DefaultItemTile } from '../ui/item-tile'
import { AddSelectionTile as DefaultAddSelectionTile } from './add-selection-tile'
import { EmptyLibrary as DefaultEmptyLibrary } from './empty-library'
import type { TLLibraryItemOrdering } from './item-order'
import { useLibrariesComponentOverrides } from './libraries-components'
import type { PrepareItemContent } from './save-shapes'
import { useLibraryCan } from './use-library-can'
import { useLibraryItemActions } from './use-library-item-actions'
import { useLibraryItems } from './use-library-items'
import { useLibraryThumbnailUrls } from './use-library-thumbnail-urls'
import { useSaveSelectionToLibrary } from './use-save-selection-to-library'

const messages = defineMessages({
	unnamedItem: { id: 'libraries.unnamed-item', defaultMessage: 'Unnamed item' },
})

export interface LibraryItemsProps {
	source: LibrarySource
	library: TLLibrary
	/** Where the tiles are measured for their thumbnail size. */
	container: HTMLElement | null
	getItemProps(itemId: TLLibraryItemId): ButtonHTMLAttributes<HTMLButtonElement>
	ordering: TLLibraryItemOrdering
	reversed: boolean
	prepareItemContent?: PrepareItemContent
}

export function LibraryItems({
	source,
	library,
	container,
	getItemProps,
	ordering,
	reversed,
	prepareItemContent,
}: LibraryItemsProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const overrides = useLibrariesComponentOverrides()
	const {
		ItemTile = DefaultItemTile,
		ItemMenu = DefaultItemMenu,
		EmptyLibrary = DefaultEmptyLibrary,
		AddSelectionTile = DefaultAddSelectionTile,
	} = overrides
	const libraryId = library.id
	const items = useLibraryItems(source, libraryId, { ordering, reversed })
	const thumbnailUrls = useLibraryThumbnailUrls(source, items, { container })
	const canRename = useLibraryCan(source, 'updateItem', libraryId)
	const canAdd = useLibraryCan(source, 'addItem', libraryId)
	const canDelete = useLibraryCan(source, 'deleteItem', libraryId)
	const { rename, move, copy, requestDelete, moveTargets, copyTargets } = useLibraryItemActions(
		source,
		libraryId
	)
	// An override can add entries of its own, so it has a menu whatever the source allows.
	const hasItemMenu =
		ItemMenu !== null &&
		(overrides.ItemMenu !== undefined ||
			canRename ||
			canDelete ||
			moveTargets.length > 0 ||
			copyTargets.length > 0)
	const getTileProps = useCallback(
		(itemId: TLLibraryItemId) => {
			const props = getItemProps(itemId)
			if (!hasItemMenu) return props
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
		[getItemProps, hasItemMenu, editor]
	)
	const { saveSelection } = useSaveSelectionToLibrary(source, prepareItemContent)
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])

	if (items.length === 0 && !canAdd) {
		return EmptyLibrary && <EmptyLibrary library={library} />
	}

	return (
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
			{canAdd && AddSelectionTile && (
				<ItemGridTile>
					<AddSelectionTile
						library={library}
						hasSelection={hasSelection}
						onAddSelection={() => saveSelection(libraryId)}
					/>
				</ItemGridTile>
			)}
		</ItemGrid>
	)
}
