import { createContext, useContext } from 'react'

export type SidebarContext = {
	isOpen: boolean
}

const sidebarContext = createContext<SidebarContext>({ isOpen: true })

export function SidebarProvider({ children }: { children: any }) {
	return <sidebarContext.Provider value={{ isOpen: true }}>{children}</sidebarContext.Provider>
}

export function useSidebar() {
	return useContext(sidebarContext)
}
