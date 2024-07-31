import { DEFAULT_EMBED_DEFINITIONS, EmbedDefinition } from '@tldraw/tlschema'
import { ReactNode, createContext, useContext } from 'react'

const EmbedDefintionsContext = createContext<null | readonly EmbedDefinition[]>(null)

interface EmbedDefintionsProviderProps {
	embeds?: readonly EmbedDefinition[] | undefined
	children: ReactNode
}

export function EmbedDefinitionsProvider({
	embeds = DEFAULT_EMBED_DEFINITIONS,
	children,
}: EmbedDefintionsProviderProps) {
	return (
		<EmbedDefintionsContext.Provider value={embeds}>{children}</EmbedDefintionsContext.Provider>
	)
}

/** @public */
export function useEmbedDefinitions() {
	const embeds = useContext(EmbedDefintionsContext)
	if (!embeds) {
		throw new Error('useEditorComponents must be used inside of <EditorComponentsProvider />')
	}
	return embeds
}
