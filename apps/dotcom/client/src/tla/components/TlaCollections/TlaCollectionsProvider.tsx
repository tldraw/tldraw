import type { CollectionSource } from '@tldraw/collections'
import { createContext, ReactNode, useContext } from 'react'
import { useMaybeApp } from '../../hooks/useAppState'
import { getCollectionsSource } from './collectionsSource'

const CollectionsContext = createContext<CollectionSource | null>(null)

/** The collections source, or null when the `collections` flag is off for this user. */
export function useCollectionSource() {
	return useContext(CollectionsContext)
}

export function TlaCollectionsProvider({ children }: { children: ReactNode }) {
	const app = useMaybeApp()
	return (
		<CollectionsContext.Provider value={getCollectionsSource(app?.isCollectionsEnabled ?? false)}>
			{children}
		</CollectionsContext.Provider>
	)
}
