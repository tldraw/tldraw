'use client'
import { AppChrome } from '../components/AppChrome'
import { Chat } from '../components/Chat'

export default function Home() {
	return (
		<div className="app-shell tl-theme__dark">
			<AppChrome />
			<main className="app-main">
				<Chat />
			</main>
		</div>
	)
}
