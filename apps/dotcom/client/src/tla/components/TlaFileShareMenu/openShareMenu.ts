import { commentsSidebarOpen } from '@tldraw/commenting'
import { Editor } from 'tldraw'

// openShareMenu targets the header popover by id, so the header must render with this source.
export const FILE_HEADER_SHARE_SOURCE = 'file-header'

export function getShareMenuId(fileId: string | undefined, source: string) {
	return `share-${fileId}-${source}`
}

export function openShareMenu(editor: Editor, fileId: string) {
	// Opening here skips the popover's onOpenChange, so mirror what the header does on open.
	editor.complete()
	commentsSidebarOpen.set(editor, false)
	// No header in focus mode. Its popover reads the menus atom on mount, so it opens once shown.
	if (editor.getInstanceState().isFocusMode) editor.updateInstanceState({ isFocusMode: false })
	editor.menus.addOpenMenu(getShareMenuId(fileId, FILE_HEADER_SHARE_SOURCE))
}
