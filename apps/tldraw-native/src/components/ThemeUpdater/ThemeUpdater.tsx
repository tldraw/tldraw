import { Helmet } from 'react-helmet-async'
import { useEditor, useValue } from 'tldraw'

export function ThemeUpdater() {
	const editor = useEditor()
	const darkMode = useValue('isDarkMode', () => editor.user.getIsDarkMode(), [editor])
	return (
		<Helmet>
			<meta name="theme-color" content={darkMode ? '#000000' : '#ffffff'} data-rh="true" />
		</Helmet>
	)
}
