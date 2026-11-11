export {
	AddToLibraryMenuItem,
	type AddToLibraryMenuItemProps,
} from './canvas/add-to-library-menu-item'
export { LibrariesPanel, type LibrariesPanelProps } from './canvas/libraries-panel'
export { LibrariesPanelButton } from './canvas/libraries-panel-button'
export { LibrariesQuickActions } from './canvas/libraries-quick-actions'
export { placeLibraryItem } from './canvas/place-item'
export {
	saveShapesToLibrary,
	type PrepareItemContent,
	type SaveShapesOptions,
} from './canvas/save-shapes'
export { activeLibraryId, librariesPanelOpen, toggleLibrariesPanel } from './canvas/state'
export { wrapInGroup } from './canvas/wrap-in-group'
export {
	LibraryMenu,
	type LibraryMenuCopy,
	type LibraryMenuMove,
	type LibraryMenuProps,
	type LibraryMenuSort,
} from './ui/library-menu'
export {
	ItemGrid,
	ItemGridItems,
	ItemGridTile,
	type ItemGridItem,
	type ItemGridItemsProps,
	type ItemGridProps,
	type ItemGridTileProps,
} from './ui/item-grid'
export { getItemMenuId, ItemMenu, type ItemMenuProps } from './ui/item-menu'
export { ItemTile, type ItemTileProps } from './ui/item-tile'
export {
	MenuItem as LibraryMenuItem,
	type MenuItemProps as LibraryMenuItemProps,
} from './ui/menu-items'
export { RenameInput, type RenameInputProps } from './ui/rename-input'
export {
	LibraryNotFoundError,
	LibraryPermissionError,
	type LibrarySource,
	type TLLibraryAction,
	type TLLibraryOwner,
	type TLLibraryTarget,
	type TLLibraryThumbnailContext,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from './lib/LibrarySource'
export {
	CompositeLibrarySource,
	type CompositeLibrarySourceOptions,
	type CompositeLibrarySourcePart,
} from './lib/CompositeLibrarySource'
export type { LibraryPack, LibraryPackItem } from './lib/LibraryPack'
export { copyLibrary } from './lib/copyLibrary'
export { copyPack } from './lib/copyPack'
export {
	InMemoryLibrarySource,
	type InMemoryLibrarySourceOptions,
} from './lib/InMemoryLibrarySource'
export {
	LibraryItemContentTooNewError,
	LibraryItemRecordType,
	libraryItemMigrations,
	libraryMigrations,
	LibraryRecordType,
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	libraryItemValidator,
	libraryValidator,
	getThumbnailForColorMode,
	mapThumbnail,
	parseLibraryItemContent,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
	type TLLibraryRecord,
	type TLLibraryThumbnail,
} from './lib/schema'
