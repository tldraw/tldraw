import { useEditor, useValue } from '@tldraw/editor'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'

export function ExitPenMode() {
	const editor = useEditor()
	const isPenMode = useValue('is pen mode', () => editor.getInstanceState().isPenMode, [editor])

	if (!isPenMode) return null

	return <TldrawUiMenuActionItem actionId="exit-pen-mode" />
}
