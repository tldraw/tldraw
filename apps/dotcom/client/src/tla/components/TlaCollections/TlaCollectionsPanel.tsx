import { AddToCollectionMenuItem, CollectionsPanel } from '@tldraw/collections'
import { useMemo } from 'react'
import { useEditor } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { getEditorCollections } from './editorCollections'
import { STARTER_PACKS } from './starterPacks'

function useEditorCollections(fileId: string) {
	const app = useMaybeApp()
	const editor = useEditor()
	const collections = app?.collections
	return useMemo(
		() => (app && collections ? getEditorCollections(app, collections, editor, fileId) : null),
		[app, collections, editor, fileId]
	)
}

export function TlaCollectionsPanel({ fileId }: { fileId: string }) {
	const source = useEditorCollections(fileId)
	if (!source) return null
	return <CollectionsPanel source={source} catalogue={STARTER_PACKS} side="right" />
}

export function TlaAddToCollectionMenuItem({ fileId }: { fileId: string }) {
	const source = useEditorCollections(fileId)
	if (!source) return null
	return <AddToCollectionMenuItem source={source} />
}
