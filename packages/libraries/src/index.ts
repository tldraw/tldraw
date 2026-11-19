export { AddSelectionTile, type AddSelectionTileProps } from './canvas/add-selection-tile'
export {
	AddToLibraryMenuItem,
	type AddToLibraryMenuItemProps,
} from './canvas/add-to-library-menu-item'
export { EmptyLibrary, type EmptyLibraryProps } from './canvas/empty-library'
export {
	type LibrariesComponents,
	LibrariesComponentsProvider,
	type LibrariesComponentsProviderProps,
} from './canvas/libraries-components'
export { useLibrariesComponents } from './canvas/use-libraries-components'
export { LibrariesPanel, type LibrariesPanelProps } from './canvas/libraries-panel'
export {
	LibrariesPanelHeader,
	type LibrariesPanelHeaderProps,
	type NewLibraryAction,
} from './canvas/libraries-panel-header'
export { LibrariesPanelButton } from './canvas/libraries-panel-button'
export { LibrariesQuickActions, LibrariesToolbarButton } from './canvas/libraries-quick-actions'
export {
	LibrarySectionHeader,
	type LibrarySectionHeaderProps,
} from './canvas/library-section-header'
export { LibraryTabLabel, type LibraryTabLabelProps } from './canvas/library-tab-label'
export { useLibrariesEnabled } from './canvas/license'
export { NoLibraries, type NoLibrariesProps } from './canvas/no-libraries'
export { placeLibraryItem } from './canvas/place-item'
export {
	saveShapesToLibrary,
	type PrepareItemContent,
	type SaveShapesOptions,
} from './canvas/save-shapes'
export {
	activeLibraryId,
	collapsedLibraryIds,
	librariesPanelOpen,
	toggleLibrariesPanel,
} from './canvas/state'
export {
	getLibraryErrorReason,
	type TLLibrariesUiEventMap,
	type TLLibraryErrorReason,
} from './canvas/ui-events'
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
export { BoardIcon } from './ui/board-icon'
export { getItemMenuId, ItemMenu, type ItemMenuProps } from './ui/item-menu'
export { ItemTile, type ItemTileProps } from './ui/item-tile'
export {
	MenuItem as LibraryMenuItem,
	type LibraryMenuTarget,
	type MenuItemProps as LibraryMenuItemProps,
} from './ui/menu-items'
export { RenameInput, type RenameInputProps } from './ui/rename-input'
export {
	LibraryNotFoundError,
	LibraryPermissionError,
	type LibrarySource,
	type TLLibraryAction,
	type TLLibraryItemPartial,
	type TLLibraryOwner,
	type TLLibraryTarget,
	type TLLibraryThumbnailContext,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from './lib/LibrarySource'
export { addItemsToLibrary } from './lib/addItemsToLibrary'
export { saveErrorMessages } from './lib/saveErrorMessages'
export { trackItemsStoring, whenItemsStored } from './lib/whenItemsStored'
export { BoardLibrarySource, type BoardLibrarySourceOptions } from './lib/BoardLibrarySource'
export {
	CompositeLibrarySource,
	type CompositeLibrarySourceOptions,
	type CompositeLibrarySourcePart,
} from './lib/CompositeLibrarySource'
export { parseLibraryPack, type LibraryPack, type LibraryPackItem } from './lib/LibraryPack'
export { copyLibrary } from './lib/copyLibrary'
export { copyPack } from './lib/copyPack'
export {
	InMemoryLibrarySource,
	type InMemoryLibrarySourceOptions,
} from './lib/InMemoryLibrarySource'
export {
	LibraryItemContentTooNewError,
	LibraryItemRecordType,
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	libraryItemValidator,
	libraryThumbnailValidator,
	getThumbnailForColorMode,
	mapThumbnail,
	parseLibraryItemContent,
	type TLLibraryItem,
	type TLLibraryItemContent,
} from './lib/schema'
export {
	LibraryRecordType,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryItemId,
	type TLLibraryThumbnail,
} from '@tldraw/tlschema'
