import { createContext, useContext, useMemo } from 'react'
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
	| 'command-palette'

const menuContext = createContext<{
	type: TLUiMenuContextType
	sourceId: TLUiEventSource
} | null>(null)

/** @public */
export function useTldrawUiMenuContext() {
	const context = useContext(menuContext)
	if (!context) {
		throw new Error('useTldrawUiMenuContext must be used within a TldrawUiMenuContextProvider')
	}
	return context
}

/** @public */
export interface TLUiMenuContextProviderProps {
	type: TLUiMenuContextType
	sourceId: TLUiEventSource
	children: React.ReactNode
}

/** @public @react */
export function TldrawUiMenuContextProvider({
	type,
	sourceId,
	children,
}: TLUiMenuContextProviderProps) {
	// A fresh value each render would re-render every item in the menu whenever the menu renders.
	const value = useMemo(() => ({ type, sourceId }), [type, sourceId])
	return <menuContext.Provider value={value}>{children}</menuContext.Provider>
}
