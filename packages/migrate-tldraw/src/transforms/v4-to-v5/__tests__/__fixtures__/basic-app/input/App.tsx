import { Tldraw, useIsDarkMode, getDefaultColorTheme } from 'tldraw'

export function App() {
	const isDark = useIsDarkMode()
	const theme = getDefaultColorTheme({ isDarkMode: isDark })
	const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
	return (
		<>
			<Tldraw inferDarkMode />
			<Tldraw inferDarkMode={true} />
			<Tldraw inferDarkMode={prefersDark} />
			<Tldraw inferDarkMode={false} />
			<span style={{ color: theme.blue.semi }} />
		</>
	)
}
