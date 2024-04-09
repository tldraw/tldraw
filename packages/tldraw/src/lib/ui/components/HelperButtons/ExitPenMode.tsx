import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../context/actions'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

export function ExitPenMode() {
	const editor = useEditor()
	const actions = useActions()
	const isPenMode = useValue('is pen mode', () => editor.getInstanceState().isPenMode, [editor])

	if (!isPenMode) return null

	return <TldrawUiMenuItem {...actions['exit-pen-mode']} />
}
