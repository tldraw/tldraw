import { useEditor } from '@tldraw/editor'
import { useValue } from 'signia-react'

/** @public */
export function useCanRedo() {
	const editor = useEditor()
	return useValue('useCanRedo', () => editor.canRedo, [editor])
}
