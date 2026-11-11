import { commentsSidebarOpen } from '@tldraw/commenting'
import { librariesPanelOpen } from '@tldraw/libraries'
import { useEffect } from 'react'
import { Editor, react } from 'tldraw'

export function useOneSidePanelOpen(editor: Editor) {
	useEffect(() => {
		let wasCommentsOpen = commentsSidebarOpen.get(editor)
		let wasLibrariesOpen = librariesPanelOpen.get(editor)
		return react('one side panel open', () => {
			const commentsOpen = commentsSidebarOpen.get(editor)
			const librariesOpen = librariesPanelOpen.get(editor)
			if (commentsOpen && !wasCommentsOpen) librariesPanelOpen.set(editor, false)
			else if (librariesOpen && !wasLibrariesOpen) commentsSidebarOpen.set(editor, false)
			wasCommentsOpen = commentsSidebarOpen.get(editor)
			wasLibrariesOpen = librariesPanelOpen.get(editor)
		})
	}, [editor])
}
