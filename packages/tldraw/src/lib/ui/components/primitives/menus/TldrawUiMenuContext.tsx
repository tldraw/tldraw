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
	// Stable value: the palette shell re-renders on every store change, and fresh context would
	// re-run every item registration and loop.
	const value = useMemo(() => ({ type, sourceId }), [type, sourceId])
	return <menuContext.Provider value={value}>{children}</menuContext.Provider>
}
