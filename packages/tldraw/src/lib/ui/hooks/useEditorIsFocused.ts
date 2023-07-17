import { useEditor, useValue } from '@tldraw/editor'

export function useEditorIsFocused() {
	const editor = useEditor()
	return useValue('editor.isFocused', () => editor.isFocused, [editor])
}
