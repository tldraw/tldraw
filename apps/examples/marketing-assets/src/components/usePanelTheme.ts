import { Editor, useValue } from 'tldraw'

/**
 * The tldraw theme class to apply to a custom panel so its `--tl-*` colour
 * variables follow the editor's light/dark setting. Returns `tl-theme__dark`
 * when the editor is in dark mode, `tl-theme__light` otherwise.
 */
export function usePanelTheme(editor: Editor): 'tl-theme__dark' | 'tl-theme__light' {
	return useValue(
		'panel theme',
		() => (editor.user.getIsDarkMode() ? 'tl-theme__dark' : 'tl-theme__light'),
		[editor]
	)
}
