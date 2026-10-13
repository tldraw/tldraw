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

interface PathContextValue {
	path: readonly string[]
	submenu: CommandPaletteSubmenu | null
	section: string | null
	heading: string | null
	showIcons: boolean
	pinned: boolean
	collapseSubmenu: boolean
}

const PathContext = createContext<PathContextValue>({
	path: [],
	submenu: null,
	section: null,
	heading: null,
	showIcons: false,
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
	showIcons,
	pinned,
	collapseSubmenu,
	children,
}: {
	label?: string
	submenuId?: string
	submenuIcon?: string | TLUiIconJsx
	/** Starts a section that an opened submenu separates from its neighbours, like a menu group. */
	sectionId?: string
	/** A group label; the outermost one heads its items when group headings are on. */
	heading?: string
	/** Items inside always show their icon, e.g. tools, which are recognized by it. */
	showIcons?: boolean
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
			showIcons: parent.showIcons || !!showIcons,
			pinned: parent.pinned || !!pinned,
			collapseSubmenu: submenuId ? false : parent.collapseSubmenu || !!collapseSubmenu,
		}),
		[parent, label, submenuId, submenuIcon, sectionId, heading, showIcons, pinned, collapseSubmenu]
	)
	return <PathContext.Provider value={value}>{children}</PathContext.Provider>
}

/**
 * Lists the command palette items inside first, above recents, while browsing, e.g. unread
 * notifications. Renders its children unchanged outside the palette.
 *
 * @internal
 */
export function CommandPalettePinned({ children }: { children: ReactNode }) {
	return <CommandPalettePathProvider pinned>{children}</CommandPalettePathProvider>
}

/**
 * Keeps the submenu inside as one command palette row you open, even with a single item, and its
 * items out of top-level search, e.g. notifications, whose text shouldn't show until asked for.
 *
 * @internal
 */
export function CommandPaletteCollapsed({ children }: { children: ReactNode }) {
	return <CommandPalettePathProvider collapseSubmenu>{children}</CommandPalettePathProvider>
}
