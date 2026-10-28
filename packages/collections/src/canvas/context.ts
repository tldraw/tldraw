import { createContext, useContext } from 'react'
import type { CollectionSource } from '../lib/CollectionSource'

export const CollectionSourceContext = createContext<CollectionSource | null>(null)

/** The source the surrounding {@link CollectionsPanel} was given. */
export function useCollectionSource(): CollectionSource {
	const source = useContext(CollectionSourceContext)
	if (!source) throw new Error('useCollectionSource must be used inside a CollectionsPanel')
	return source
}
