import { AddToCollectionMenuItem, CollectionsPanel } from '@tldraw/collections'
import { useMemo } from 'react'
import { useEditor } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { getEditorCollections } from './editorCollections'
import { TlaBrowseStarterPacksMenuItem } from './TlaStarterPacksDialog'

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
	const app = useMaybeApp()
	const source = useEditorCollections(fileId)
	if (!app || !source) return null
	return (
		<CollectionsPanel
			source={source}
			side="right"
			menuItems={
				<TlaBrowseStarterPacksMenuItem source={source} ownerId={app.getHomeWorkspaceId()} />
			}
		/>
	)
}

export function TlaAddToCollectionMenuItem({ fileId }: { fileId: string }) {
	const source = useEditorCollections(fileId)
	if (!source) return null
	return <AddToCollectionMenuItem source={source} />
}
