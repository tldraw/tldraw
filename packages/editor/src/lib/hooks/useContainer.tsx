import { assertExists } from '@tldraw/utils'
import { createContext, useContext } from 'react'

const ContainerContext = createContext<HTMLDivElement | null>(null)

/** @internal */
export function ContainerProvider({
	container,
	children,
}: {
	container: HTMLDivElement
	children: React.ReactNode
}) {
	return <ContainerContext.Provider value={container}>{children}</ContainerContext.Provider>
}

/** @public */
export function useContainer(): HTMLDivElement {
	return assertExists(useContext(ContainerContext), 'useContainer used outside of <Tldraw />')
}
