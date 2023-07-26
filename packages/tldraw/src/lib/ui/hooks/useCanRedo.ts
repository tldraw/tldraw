import { useValue } from '@tldraw/state'
import { useEditor } from '../../editor'

/** @public */
export function useCanRedo() {
	const editor = useEditor()
	return useValue('useCanRedo', () => editor.canRedo, [editor])
}
