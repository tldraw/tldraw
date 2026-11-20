import { useEditor } from '@tldraw/editor'
import { MouseEventHandler, useCallback } from 'react'
import { openLink } from '../../utils/openLink'

/**
 * Click handler for an `<a href>` that holds a user-provided link. Letting the browser follow the
 * href would skip {@link openLink}'s check, so a modified or middle click on an unknown app link
 * would open it without asking. Use it for both `onClick` and `onAuxClick`.
 */
export function useOpenLinkHandler(url: string) {
	const editor = useEditor()
	return useCallback<MouseEventHandler>(
		(e) => {
			if (e.type === 'auxclick' && e.button !== 1) return
			e.preventDefault()
			openLink(editor, url)
		},
		[editor, url]
	)
}
