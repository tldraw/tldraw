import { type ComponentType, createContext, type ReactNode, useContext, useMemo } from 'react'
import { useShallowObjectIdentity } from 'tldraw'
import type { TLLibrary, TLLibraryItem } from '../lib/schema'
import { ItemMenu, type ItemMenuProps } from '../ui/item-menu'
import { ItemTile, type ItemTileProps } from '../ui/item-tile'
import { LibraryMenu, type LibraryMenuProps } from '../ui/library-menu'
import { AddSelectionTile, type AddSelectionTileProps } from './add-selection-tile'
import { EmptyLibrary, type EmptyLibraryProps } from './empty-library'
import { LibrariesPanelHeader, type LibrariesPanelHeaderProps } from './libraries-panel-header'
import { LibrarySectionHeader, type LibrarySectionHeaderProps } from './library-section-header'
import { LibraryTabLabel, type LibraryTabLabelProps } from './library-tab-label'
import { NoLibraries, type NoLibrariesProps } from './no-libraries'

/**
 * Component overrides for the {@link LibrariesPanel}. Each slot replaces a built-in piece: leave a
 * slot unset to keep its default, or set it to `null` to hide it. Each default is exported, so an
 * override that only adds something can spread its props into the default.
 *
 * @public
 */
export interface LibrariesComponents {
	/**
	 * The panel's header: its title, "New library" button and ⋯ menu. Replaces the default
	 * {@link LibrariesPanelHeader}.
	 */
	LibrariesPanelHeader?: ComponentType<LibrariesPanelHeaderProps> | null
	/**
	 * What an owner's tab shows, for a source with two or more owners. Replaces the default
	 * {@link LibraryTabLabel}, the owner's icon and name.
	 */
	LibraryTabLabel?: ComponentType<LibraryTabLabelProps> | null
	/**
	 * Shown in place of the libraries when there are none, or none in a tab. Replaces the
	 * default {@link NoLibraries} message.
	 */
	NoLibraries?: ComponentType<NoLibrariesProps> | null
	/**
	 * A library's header: its name, which folds the library shut, and its ⋯ menu. Replaces the
	 * default {@link LibrarySectionHeader}, which renders the `LibraryMenu` slot. Use `LibraryMenu`
	 * instead when only the menu is changing.
	 */
	LibrarySectionHeader?: ComponentType<LibrarySectionHeaderProps> | null
	/**
	 * A library's ⋯ menu, in its header. Replaces the default {@link LibraryMenu}, so a menu that
	 * only adds actions can pass them to it as children, e.g. {@link LibraryMenuItem}s. The panel's
	 * own ⋯ menu is part of `LibrariesPanelHeader`.
	 */
	LibraryMenu?: ComponentType<LibraryMenuProps & { library: TLLibrary }> | null
	/**
	 * Shown in place of a library's items when it has none and they can't be added. Replaces the
	 * default {@link EmptyLibrary} message.
	 */
	EmptyLibrary?: ComponentType<EmptyLibraryProps> | null
	/**
	 * An item's tile. Replaces the default {@link ItemTile}. Spread `buttonProps` onto the element
	 * that should place the item when clicked or dragged, and show `menu`, the `ItemMenu` slot, over
	 * the tile.
	 */
	ItemTile?: ComponentType<ItemTileProps & { item: TLLibraryItem }> | null
	/**
	 * An item's ⋯ menu, passed to its tile as `menu`. Replaces the default {@link ItemMenu}. Keep
	 * the menu's `id`: right-clicking the tile opens the menu with that id.
	 */
	ItemMenu?: ComponentType<ItemMenuProps & { item: TLLibraryItem }> | null
	/**
	 * The tile after a library's items that adds the selected shapes to it, shown when the source
	 * allows adding items. Replaces the default {@link AddSelectionTile}.
	 */
	AddSelectionTile?: ComponentType<AddSelectionTileProps> | null
}

const LibrariesComponentsContext = createContext<LibrariesComponents>({})

/** @public */
export interface LibrariesComponentsProviderProps {
	/** Overrides for the libraries UI inside this provider. */
	components?: LibrariesComponents
	children: ReactNode
}

/**
 * Provides {@link LibrariesComponents} overrides to the libraries UI inside it, in place of any
 * from a provider above it. The {@link LibrariesPanel} renders one with its `components` prop.
 * @public @react
 */
export function LibrariesComponentsProvider({
	components = {},
	children,
}: LibrariesComponentsProviderProps) {
	const value = useShallowObjectIdentity(components)
	return (
		<LibrariesComponentsContext.Provider value={value}>
			{children}
		</LibrariesComponentsContext.Provider>
	)
}

/**
 * The libraries UI's components: the defaults, with the overrides from the nearest
 * {@link LibrariesComponentsProvider} in their place. A hidden slot is `null`.
 * @public
 */
export function useLibrariesComponents(): Required<LibrariesComponents> {
	const overrides = useContext(LibrariesComponentsContext)
	return useMemo(
		() => ({
			LibrariesPanelHeader,
			LibraryTabLabel,
			NoLibraries,
			LibrarySectionHeader,
			LibraryMenu,
			EmptyLibrary,
			ItemTile,
			ItemMenu,
			AddSelectionTile,
			...overrides,
		}),
		[overrides]
	)
}
