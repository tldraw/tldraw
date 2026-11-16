import { type ComponentType, createContext, type ReactNode, useContext } from 'react'
import { useShallowObjectIdentity } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibrary, TLLibraryItem } from '../lib/schema'
import type { ItemMenuProps } from '../ui/item-menu'
import type { ItemTileProps } from '../ui/item-tile'
import type { LibraryMenuProps } from '../ui/library-menu'
import type { AddSelectionTileProps } from './add-selection-tile'
import type { EmptyLibraryProps } from './empty-library'
import type { LibrariesPanelHeaderProps } from './libraries-panel-header'
import type { LibrarySectionHeaderProps } from './library-section-header'
import type { LibraryTabLabelProps } from './library-tab-label'
import type { NoLibrariesProps } from './no-libraries'

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
	 * A library's header: its name, which folds the library shut, and its ⋯ menu, passed as `menu`
	 * from the `LibraryMenu` slot. Replaces the default {@link LibrarySectionHeader}. An override
	 * must end a rename it's shown, as the default's input does, or the panel stays in renaming. Use
	 * `LibraryMenu` instead when only the menu is changing.
	 */
	LibrarySectionHeader?: ComponentType<LibrarySectionHeaderProps> | null
	/**
	 * A library's ⋯ menu, passed to its header as `menu`. Replaces the default {@link LibraryMenu}, so a menu that
	 * only adds actions can pass them to it as children, e.g. {@link LibraryMenuItem}s. The panel's
	 * own ⋯ menu is part of `LibrariesPanelHeader`.
	 */
	LibraryMenu?: ComponentType<
		LibraryMenuProps & { source: LibrarySource; library: TLLibrary }
	> | null
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
	 * the menu's `id`: right-clicking the tile opens the menu with that id. With an override set,
	 * right-click always opens it, so an override that renders nothing for an item leaves that
	 * item's right-click empty.
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
 * The overrides from the nearest provider, without the defaults. Each place that renders a slot
 * fills in its default with a destructuring default, which keeps `null` as null.
 */
export function useLibrariesComponentOverrides() {
	return useContext(LibrariesComponentsContext)
}
