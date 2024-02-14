import { createContext, useContext } from 'react'
import { TLUiEventSource } from '../../hooks/useEventsProvider'

/** @public */
export type TldrawUiMenuContextType =
	| 'panel'
	| 'menu'
	| 'context-menu'
	| 'actions'
	| 'keyboard-shortcuts'
	| 'helper-buttons'

const menuContext = createContext<{
	type: TldrawUiMenuContextType
	sourceId: TLUiEventSource
}>({ type: 'menu', sourceId: 'menu' })

/** @public */
export function useTldrawUiMenuContext() {
	return useContext(menuContext)
}

/** @public */
export type TLUiMenuContextProviderProps = {
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
