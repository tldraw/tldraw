import { createContext, useContext } from 'react'

export type MenuContextType = 'menu' | 'context-menu' | 'actions-menu'

const menuContext = createContext('menu')

export function useMenuContext() {
	return useContext(menuContext)
}

export function TldrawUiMenuContextProvider({
	type,
	children,
}: {
	type: MenuContextType
	children: React.ReactNode
}) {
	return <menuContext.Provider value={type}>{children}</menuContext.Provider>
}
