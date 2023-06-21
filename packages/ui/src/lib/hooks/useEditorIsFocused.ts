import { useEditor } from '@tldraw/editor'
import { useValue } from '@tldraw/state'

export function useEditorIsFocused() {
	const editor = useEditor()
	return useValue('editor.isFocused', () => editor.isFocused, [editor])
}
