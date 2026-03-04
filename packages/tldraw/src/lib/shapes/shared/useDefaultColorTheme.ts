import type { TLTheme } from '@tldraw/editor'
import { useEditor } from '@tldraw/editor'

/**
 * @deprecated Use `useEditor().getCurrentTheme()` instead.
 * @public
 */
export function useDefaultColorTheme(): TLTheme {
	return useEditor().getCurrentTheme()
}
