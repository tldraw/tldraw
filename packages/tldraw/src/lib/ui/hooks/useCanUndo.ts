import { useEditor, useValue } from '@tldraw/editor'

/** @public */
export function useCanUndo() {
	const editor = useEditor()
	return useValue('useCanUndo', () => editor.canUndo, [editor])
}
