import { useValue } from '@tldraw/editor'
import { ReactNode, createContext, useContext, useMemo } from 'react'
import { CommandPaletteStore, CommandPaletteSubmenu } from './CommandPaletteStore'

const StoreContext = createContext<CommandPaletteStore | null>(null)

/** @internal */
export function CommandPaletteStoreProvider({
	store,
	children,
}: {
	/** The open palette's store, which the items inside register their rows with. */
	store: CommandPaletteStore
	/** The palette's items. */
	children: ReactNode
}) {
	return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

/** @internal */
export function useCommandPaletteStore() {
	const store = useContext(StoreContext)
	if (!store) throw new Error('Command palette items must be rendered inside a command palette')
	return store
}

/**
 * The text typed into the command palette, or '' outside one. Lets large or async groups render
 * only their best matches.
 *
 * @public
 */
export function useCommandPaletteQuery(): string {
	const store = useContext(StoreContext)
	return useValue('command palette query', () => store?.query.get() ?? '', [store])
}

/**
 * The id of the item highlighted in the command palette, by keyboard or pointer, or null.
 * Internal because previewing anything stored in the document would sync each highlight and add
 * it to history.
 *
 * @internal
 */
export function useCommandPaletteActiveItemId(): string | null {
	const store = useContext(StoreContext)
	return useValue('command palette active item', () => store?.activeItemId.get() ?? null, [store])
}

interface PathContextValue {
	path: readonly string[]
	submenu: CommandPaletteSubmenu | null
	section: string | null
	heading: string | null
	pinned: boolean
	onDemandSubmenu: boolean
}

const PathContext = createContext<PathContextValue>({
	path: [],
	submenu: null,
	section: null,
	heading: null,
	pinned: false,
	onDemandSubmenu: false,
})

/** @internal */
export function useCommandPalettePath() {
	return useContext(PathContext)
}

/** @internal */
export function CommandPalettePathProvider({
	label,
	submenuId,
	sectionId,
	heading,
	pinned,
	onDemandSubmenu,
	children,
}: {
	/**
	 * Added to the search path of the items inside, so searching it finds them. With `submenuId`,
	 * also the submenu's label.
	 */
	label?: string
	/** Groups the items inside into a submenu keyed by this id. Needs `label`. */
	submenuId?: string
	/** Starts a section that an opened submenu separates from its neighbours, like a menu group. */
	sectionId?: string
	/** A group label; the outermost one heads its items. */
	heading?: string
	/** Items inside are listed first, above recents, while browsing. */
	pinned?: boolean
	/** The next submenu inside opens on demand: always one row, its items hidden outside it. */
	onDemandSubmenu?: boolean
	/** Items and nested providers this level applies to. */
	children: ReactNode
}) {
	const parent = useContext(PathContext)
	const value = useMemo<PathContextValue>(
		() => ({
			path: label ? [...parent.path, label] : parent.path,
			submenu:
				submenuId && label
					? {
							key: [...parent.path, submenuId].join('/'),
							label,
							onDemand: parent.onDemandSubmenu,
						}
					: parent.submenu,
			section: sectionId ? `${parent.section ?? ''}/${sectionId}` : parent.section,
			heading: parent.heading ?? heading ?? null,
			pinned: parent.pinned || !!pinned,
			onDemandSubmenu: submenuId && label ? false : parent.onDemandSubmenu || !!onDemandSubmenu,
		}),
		[parent, label, submenuId, sectionId, heading, pinned, onDemandSubmenu]
	)
	return <PathContext.Provider value={value}>{children}</PathContext.Provider>
}

/** @public */
export interface TLUiCommandPalettePinnedProps {
	/** The items to pin. */
	children: ReactNode
}

/** @public */
export interface TLUiCommandPaletteOnDemandProps {
	/** The submenu to open on demand. */
	children: ReactNode
}

/**
 * Lists the command palette items inside first, above recents, while browsing, e.g. unread
 * notifications. Renders its children unchanged outside the palette.
 *
 * @public @react
 */
export function CommandPalettePinned({ children }: TLUiCommandPalettePinnedProps) {
	return <CommandPalettePathProvider pinned>{children}</CommandPalettePathProvider>
}

/**
 * Keeps the submenu inside as one command palette row you open, even with a single item, and keeps
 * its items out of top-level search, e.g. notifications, whose text shouldn't show until asked for.
 * Renders its children unchanged outside the palette.
 *
 * @public @react
 */
export function CommandPaletteOnDemand({ children }: TLUiCommandPaletteOnDemandProps) {
	return <CommandPalettePathProvider onDemandSubmenu>{children}</CommandPalettePathProvider>
}
