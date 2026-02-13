import { useEditor } from '@tldraw/editor'

/** @public */
export function useDefaultColorTheme() {
	return useEditor().getStyleContext().theme
}
