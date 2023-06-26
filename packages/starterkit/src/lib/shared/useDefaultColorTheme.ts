import { getDefaultColorTheme, useEditor } from '@tldraw/editor'

export function useDefaultColorTheme() {
	const editor = useEditor()
	return getDefaultColorTheme(editor)
}
