import { assertExists } from '@tldraw/utils'
import { createContext, useContext } from 'react'

const ContainerContext = createContext<HTMLElement | null>(null)

/** @public */
export interface ContainerProviderProps {
	container: HTMLElement
	children: React.ReactNode
}

/**
 * @public
 * @react
 */
export function ContainerProvider({ container, children }: ContainerProviderProps) {
	return <ContainerContext.Provider value={container}>{children}</ContainerContext.Provider>
}

/** @public */
export function useContainer(): HTMLElement {
	return assertExists(useContext(ContainerContext), 'useContainer used outside of <Tldraw />')
}

/** @public */
export function useContainerIfExists(): HTMLElement | null {
	return useContext(ContainerContext)
}
