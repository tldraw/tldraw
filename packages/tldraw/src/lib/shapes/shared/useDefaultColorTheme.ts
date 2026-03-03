import type { TLThemeColorPalette } from '@tldraw/editor'
import { useEditor } from '@tldraw/editor'

/**
 * @deprecated Use `useEditor().getCurrentTheme()` instead.
 * @public
 */
export function useDefaultColorTheme(): TLThemeColorPalette {
	return useEditor().getCurrentTheme()
}
