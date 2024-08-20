import { assertExists } from '@tldraw/utils'
import { createContext, useContext } from 'react'
import { TLEditorContainer } from '../editor/Editor'

const ContainerContext = createContext<TLEditorContainer | null>(null)

/** @internal */
export function ContainerProvider({
	container,
	children,
}: {
	container: TLEditorContainer
	children: React.ReactNode
}) {
	return <ContainerContext.Provider value={container}>{children}</ContainerContext.Provider>
}

/** @public */
export function useContainer(): TLEditorContainer {
	return assertExists(useContext(ContainerContext), 'useContainer used outside of <Tldraw />')
}

export function useContainerIfExists(): TLEditorContainer | null {
	return useContext(ContainerContext)
}
