import { AddToCollectionMenuItem, CollectionsPanel } from '@tldraw/collections'
import { useEffect } from 'react'
import { useMaybeApp } from '../../hooks/useAppState'

export function TlaCollectionsPanel({ fileId }: { fileId: string }) {
	const source = useMaybeApp()?.collections
	useEffect(() => {
		if (!source) return
		source.setOpenFileId(fileId)
		return () => source.setOpenFileId(undefined)
	}, [source, fileId])
	if (!source) return null
	return <CollectionsPanel source={source} side="right" />
}

export function TlaAddToCollectionMenuItem() {
	const source = useMaybeApp()?.collections
	if (!source) return null
	return <AddToCollectionMenuItem source={source} />
}
