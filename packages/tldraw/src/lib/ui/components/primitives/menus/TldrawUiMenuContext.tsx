import { createContext, ReactNode, useContext, useMemo } from 'react'
import { TLUiEventSource } from '../../../context/events'

/** @public */
export type TLUiMenuContextType =
	| 'menu'
	| 'small-icons'
	| 'context-menu'
	| 'icons'
	| 'keyboard-shortcuts'
	| 'helper-buttons'
	| 'toolbar'
	| 'toolbar-overflow'
	| 'collector'

/**
 * A menu item as reported to a {@link TLUiMenuCollector} by {@link TldrawUiMenuItem} or
 * {@link TldrawUiMenuCheckboxItem}.
 *
 * @public
 */
export interface TLUiMenuCollectorItem {
	id: string
	/** The translated label. Items without one aren't reported. */
	label: string
	kbd?: string
	/**
	 * Action items with `whenDisabled="hide"` are reported anyway, marked disabled, so the
	 * collector decides whether to show them.
	 */
	disabled: boolean
	/** Set for checkbox items only. */
	checked?: boolean
	/** Set for menu items only. */
	isSelected?: boolean
	detail?: string
	onSelect(source: TLUiEventSource): Promise<void> | void
}

/**
 * A menu group as reported to a {@link TLUiMenuCollector} by {@link TldrawUiMenuGroup}.
 *
 * @public
 */
export interface TLUiMenuCollectorGroup {
	id: string
	/** The translated label, if there is one. */
	label?: string
	/** The items inside. They're only collected if the returned node renders them. */
	children: ReactNode
}

/**
 * A submenu as reported to a {@link TLUiMenuCollector} by {@link TldrawUiMenuSubmenu}.
 *
 * @public
 */
export interface TLUiMenuCollectorSubmenu extends TLUiMenuCollectorGroup {
	disabled: boolean
}

/**
 * Collects menu items as data instead of rendering them, for UI such as a command palette that is
 * built from the same menu components as the rest of the UI. Pass one to
 * {@link TldrawUiMenuContextProvider} with `type="collector"`; inside it, the menu primitives
 * render what these functions return instead of their usual UI. Labels are already translated and
 * items hidden in readonly mode are left out.
 *
 * The functions are called while a primitive renders, so they can't call hooks. Return an element
 * whose component does the work instead, e.g. one that registers the item in an effect. To give
 * items their place in nested groups and submenus, wrap `children` in a context provider.
 *
 * @public
 */
export interface TLUiMenuCollector {
	renderItem(item: TLUiMenuCollectorItem): ReactNode
	renderGroup(group: TLUiMenuCollectorGroup): ReactNode
	renderSubmenu(submenu: TLUiMenuCollectorSubmenu): ReactNode
}

/** @public */
export interface TLUiMenuContextValue {
	type: TLUiMenuContextType
	sourceId: TLUiEventSource
	/** Set when `type` is `'collector'`. */
	collector?: TLUiMenuCollector
}

const menuContext = createContext<TLUiMenuContextValue | null>(null)

/** @public */
export function useTldrawUiMenuContext(): TLUiMenuContextValue {
	const context = useContext(menuContext)
	if (!context) {
		throw new Error('useTldrawUiMenuContext must be used within a TldrawUiMenuContextProvider')
	}
	return context
}

/** @internal */
export function getMenuCollector(context: TLUiMenuContextValue): TLUiMenuCollector {
	if (!context.collector) {
		throw new Error('A TldrawUiMenuContextProvider with type "collector" needs a `collector`')
	}
	return context.collector
}

/** @public */
export interface TLUiMenuContextProviderProps {
	type: TLUiMenuContextType
	sourceId: TLUiEventSource
	/** Receives the menu's items. Required when `type` is `'collector'`. */
	collector?: TLUiMenuCollector
	children: React.ReactNode
}

/** @public @react */
export function TldrawUiMenuContextProvider({
	type,
	sourceId,
	collector,
	children,
}: TLUiMenuContextProviderProps) {
	// A fresh value each render would re-render every item in the menu whenever the menu renders.
	const value = useMemo(() => ({ type, sourceId, collector }), [type, sourceId, collector])
	return <menuContext.Provider value={value}>{children}</menuContext.Provider>
}
