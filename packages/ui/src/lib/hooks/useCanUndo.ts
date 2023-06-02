import { useEditor } from '@tldraw/editor'
import { useValue } from 'signia-react'

/** @public */
export function useCanUndo() {
	const editor = useEditor()
	return useValue('useCanUndo', () => editor.canUndo, [editor])
}
