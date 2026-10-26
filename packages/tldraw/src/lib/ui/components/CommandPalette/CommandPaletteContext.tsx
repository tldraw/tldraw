import { useValue } from '@tldraw/editor'
import { ReactNode, createContext, useContext, useMemo } from 'react'
import { TLUiIconJsx } from '../primitives/TldrawUiIcon'
import { CommandPaletteStore, CommandPaletteSubmenu } from './CommandPaletteStore'

const StoreContext = createContext<CommandPaletteStore | null>(null)

/** @internal */
export function CommandPaletteStoreProvider({
	store,
	children,
}: {
	store: CommandPaletteStore
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
 * The id of the item highlighted in the command palette, by keyboard or pointer, or null. For
 * tldraw.com's theme preview. Internal because previewing anything stored in the document would
 * sync each highlight and add it to history.
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
	collapseSubmenu: boolean
}

const PathContext = createContext<PathContextValue>({
	path: [],
	submenu: null,
	section: null,
	heading: null,
	pinned: false,
	collapseSubmenu: false,
})

/** @internal */
export function useCommandPalettePath() {
	return useContext(PathContext)
}

/** @internal */
export function CommandPalettePathProvider({
	label,
	submenuId,
	submenuIcon,
	sectionId,
	heading,
	pinned,
	collapseSubmenu,
	children,
}: {
	label?: string
	submenuId?: string
	submenuIcon?: string | TLUiIconJsx
	/** Starts a section that an opened submenu separates from its neighbours, like a menu group. */
	sectionId?: string
	/** A group label; the outermost one heads its items. */
	heading?: string
	/** Items inside are listed first, above recents, while browsing. */
	pinned?: boolean
	/** The next submenu inside is always collapsed into one row. */
	collapseSubmenu?: boolean
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
							icon: submenuIcon,
							collapsed: parent.collapseSubmenu,
						}
					: parent.submenu,
			section: sectionId ? `${parent.section ?? ''}/${sectionId}` : parent.section,
			heading: parent.heading ?? heading ?? null,
			pinned: parent.pinned || !!pinned,
			collapseSubmenu: submenuId ? false : parent.collapseSubmenu || !!collapseSubmenu,
		}),
		[parent, label, submenuId, submenuIcon, sectionId, heading, pinned, collapseSubmenu]
	)
	return <PathContext.Provider value={value}>{children}</PathContext.Provider>
}

/** @public */
export interface CommandPalettePinnedProps {
	children: ReactNode
}

/** @public */
export interface CommandPaletteCollapsedProps {
	children: ReactNode
}

/**
 * Lists the command palette items inside first, above recents, while browsing, e.g. unread
 * notifications. Renders its children unchanged outside the palette.
 *
 * @public @react
 */
export function CommandPalettePinned({ children }: CommandPalettePinnedProps) {
	return <CommandPalettePathProvider pinned>{children}</CommandPalettePathProvider>
}

/**
 * Keeps the submenu inside as one command palette row you open, even with a single item, and keeps
 * its items out of top-level search, e.g. notifications, whose text shouldn't show until asked for.
 * Renders its children unchanged outside the palette.
 *
 * @public @react
 */
export function CommandPaletteCollapsed({ children }: CommandPaletteCollapsedProps) {
	return <CommandPalettePathProvider collapseSubmenu>{children}</CommandPalettePathProvider>
}
