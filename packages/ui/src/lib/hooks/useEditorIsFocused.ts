import { useEditor } from '@tldraw/editor'
import { useValue } from 'signia-react'

export function useEditorIsFocused() {
	const editor = useEditor()
	return useValue('editor.isFocused', () => editor.isFocused, [editor])
}
