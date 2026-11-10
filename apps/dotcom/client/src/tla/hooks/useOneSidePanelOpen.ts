import { collectionsPanelOpen } from '@tldraw/collections'
import { commentsSidebarOpen } from '@tldraw/commenting'
import { useEffect } from 'react'
import { Editor, react } from 'tldraw'

export function useOneSidePanelOpen(editor: Editor) {
	useEffect(() => {
		let wasCommentsOpen = commentsSidebarOpen.get(editor)
		let wasCollectionsOpen = collectionsPanelOpen.get(editor)
		return react('one side panel open', () => {
			const commentsOpen = commentsSidebarOpen.get(editor)
			const collectionsOpen = collectionsPanelOpen.get(editor)
			if (commentsOpen && !wasCommentsOpen) collectionsPanelOpen.set(editor, false)
			else if (collectionsOpen && !wasCollectionsOpen) commentsSidebarOpen.set(editor, false)
			wasCommentsOpen = commentsSidebarOpen.get(editor)
			wasCollectionsOpen = collectionsPanelOpen.get(editor)
		})
	}, [editor])
}
