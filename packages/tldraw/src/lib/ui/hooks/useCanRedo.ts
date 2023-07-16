import { useEditor } from '@tldraw/editor'
import { useValue } from '@tldraw/state'

/** @public */
export function useCanRedo() {
	const editor = useEditor()
	return useValue('useCanRedo', () => editor.canRedo, [editor])
}
