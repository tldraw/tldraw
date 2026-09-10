'use client'
import { AppChrome } from '../components/AppChrome'
import { Chat } from '../components/Chat'
import { useIsDarkMode } from '../hooks/useIsDarkMode'

export default function Home() {
	const isDarkMode = useIsDarkMode()
	return (
		<div className={`app-shell ${isDarkMode ? 'tl-theme__dark' : 'tl-theme__light'}`}>
			<AppChrome />
			<main className="app-main">
				<Chat />
			</main>
		</div>
	)
}
