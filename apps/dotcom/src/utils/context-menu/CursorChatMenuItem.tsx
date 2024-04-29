import { TldrawUiMenuItem, useActions, useEditor, useValue } from 'tldraw'
import { CURSOR_CHAT_ACTION } from '../useCursorChat'

export function CursorChatMenuItem() {
	const editor = useEditor()
	const actions = useActions()
	const shouldShow = useValue(
		'show cursor chat',
		() => editor.getCurrentToolId() === 'select' && !editor.getInstanceState().isCoarsePointer,
		[editor]
	)

	if (!shouldShow) return null

	return <TldrawUiMenuItem {...actions[CURSOR_CHAT_ACTION]} />
}
