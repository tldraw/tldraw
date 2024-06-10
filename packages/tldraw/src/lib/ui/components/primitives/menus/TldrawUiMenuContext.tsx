import { createContext, useContext } from 'react'
import { TLUiEventSource } from '../../../context/events'

/** @public */
export type TldrawUiMenuContextType =
	| 'panel'
	| 'menu'
	| 'small-icons'
	| 'context-menu'
	| 'icons'
	| 'keyboard-shortcuts'
	| 'helper-buttons'
	| 'toolbar'
	| 'toolbar-overflow'

const menuContext = createContext<{
	type: TldrawUiMenuContextType
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
	type: TldrawUiMenuContextType
	sourceId: TLUiEventSource
	children: React.ReactNode
}

/** @public */
export function TldrawUiMenuContextProvider({
	type,
	sourceId,
	children,
}: TLUiMenuContextProviderProps) {
	return <menuContext.Provider value={{ type, sourceId }}>{children}</menuContext.Provider>
}
