import { TLDefaultColorTheme, getDefaultColorTheme, useEditor, useValue } from '@tldraw/editor'
import { createContext, useContext } from 'react'

/** @public */
export const themeContext = createContext({} as TLDefaultColorTheme)

/** @public */
export function EditorThemeProvider({ children }: { children: React.ReactNode }) {
	const editor = useEditor()
	const theme = useValue(
		'theme',
		() => getDefaultColorTheme({ isDarkMode: editor.user.getIsDarkMode() }),
		[editor]
	)

	return <themeContext.Provider value={theme}>{children}</themeContext.Provider>
}

/** @public */
export function useEditorTheme() {
	return useContext(themeContext)
}
