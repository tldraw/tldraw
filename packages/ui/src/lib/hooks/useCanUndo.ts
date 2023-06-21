import { useEditor } from '@tldraw/editor'
import { useValue } from '@tldraw/state'

/** @public */
export function useCanUndo() {
	const editor = useEditor()
	return useValue('useCanUndo', () => editor.canUndo, [editor])
}
