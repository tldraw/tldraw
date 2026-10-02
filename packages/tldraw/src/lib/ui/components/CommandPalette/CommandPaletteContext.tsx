import { useValue } from '@tldraw/editor'
import { ReactNode, createContext, useContext, useMemo } from 'react'
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
}

const PathContext = createContext<PathContextValue>({ path: [], submenu: null, section: null })

/** @internal */
export function useCommandPalettePath() {
	return useContext(PathContext)
}

/** @internal */
export function CommandPalettePathProvider({
	label,
	submenuId,
	sectionId,
	children,
}: {
	label?: string
	submenuId?: string
	/** Starts a section that an opened submenu separates from its neighbours, like a menu group. */
	sectionId?: string
	children: ReactNode
}) {
	const parent = useContext(PathContext)
	const value = useMemo<PathContextValue>(
		() => ({
			path: label ? [...parent.path, label] : parent.path,
			submenu:
				submenuId && label ? { key: [...parent.path, submenuId].join('/'), label } : parent.submenu,
			section: sectionId ? `${parent.section ?? ''}/${sectionId}` : parent.section,
		}),
		[parent, label, submenuId, sectionId]
	)
	return <PathContext.Provider value={value}>{children}</PathContext.Provider>
}
