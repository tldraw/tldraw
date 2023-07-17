import { useEditor, useValue } from '@tldraw/editor'

/** @public */
export function useCanRedo() {
	const editor = useEditor()
	return useValue('useCanRedo', () => editor.canRedo, [editor])
}
