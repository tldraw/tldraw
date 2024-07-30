import { useEditor, useValue } from '@tldraw/editor'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

export function ExitPenMode() {
	const editor = useEditor()
	const isPenMode = useValue('is pen mode', () => editor.getInstanceState().isPenMode, [editor])

	if (!isPenMode) return null

	return <TldrawUiMenuItem action="exit-pen-mode" />
}
