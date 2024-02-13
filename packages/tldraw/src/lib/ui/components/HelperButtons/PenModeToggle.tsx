import { track, useEditor } from '@tldraw/editor'
import { useActions } from '../../hooks/useActions'
import { TldrawUiMenuItem } from '../menus/TldrawUiMenuItem'

export const ExitPenMode = track(function ExitPenMode() {
	const editor = useEditor()

	const isPenMode = editor.getInstanceState().isPenMode

	const actions = useActions()

	if (!isPenMode) return null

	return <TldrawUiMenuItem {...actions['exit-pen-mode']} />
})
