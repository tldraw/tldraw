import { useValue } from '@tldraw/state'
import { useEditor } from '../../editor'

/** @public */
export function useCanUndo() {
	const editor = useEditor()
	return useValue('useCanUndo', () => editor.canUndo, [editor])
}
