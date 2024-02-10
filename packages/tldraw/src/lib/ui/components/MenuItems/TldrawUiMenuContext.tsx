import { createContext, useContext } from 'react'
import { TLUiEventSource } from '../../hooks/useEventsProvider'

/** @public */
export type TldrawUiMenuContextType = 'menu' | 'context-menu' | 'actions-menu'

const menuContext = createContext<{
	type: TldrawUiMenuContextType
	sourceId: TLUiEventSource
}>({ type: 'menu', sourceId: 'menu' })

/** @public */
export function useTldrawUiMenuContext() {
	return useContext(menuContext)
}

/** @public */
export function TldrawUiMenuContextProvider({
	type,
	sourceId,
	children,
}: {
	type: TldrawUiMenuContextType
	sourceId: TLUiEventSource
	children: React.ReactNode
}) {
	return <menuContext.Provider value={{ type, sourceId }}>{children}</menuContext.Provider>
}
