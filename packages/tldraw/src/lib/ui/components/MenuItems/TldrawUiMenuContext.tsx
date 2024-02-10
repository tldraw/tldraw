import { createContext, useContext } from 'react'

/** @public */
export type TldrawUiMenuContextType = 'menu' | 'context-menu' | 'actions-menu'

const menuContext = createContext('menu')

/** @public */
export function useTldrawUiMenuContext() {
	return useContext(menuContext)
}

/** @public */
export function TldrawUiMenuContextProvider({
	type,
	children,
}: {
	type: TldrawUiMenuContextType
	children: React.ReactNode
}) {
	return <menuContext.Provider value={type}>{children}</menuContext.Provider>
}
