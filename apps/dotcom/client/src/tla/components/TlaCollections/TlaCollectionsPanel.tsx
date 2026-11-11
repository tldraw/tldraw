import { AddToCollectionMenuItem, CollectionsPanel } from '@tldraw/collections'
import { useMaybeApp } from '../../hooks/useAppState'

export function TlaCollectionsPanel() {
	const source = useMaybeApp()?.collections
	if (!source) return null
	return <CollectionsPanel source={source} side="right" />
}

export function TlaAddToCollectionMenuItem() {
	const source = useMaybeApp()?.collections
	if (!source) return null
	return <AddToCollectionMenuItem source={source} />
}
