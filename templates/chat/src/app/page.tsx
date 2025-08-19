'use client'
import { TldrawUiContextProvider } from 'tldraw'
import { Chat } from '../components/Chat'

export default function Home() {
	return (
		<main className="tl-container tl-theme__light">
			<TldrawUiContextProvider>
				<Chat />
			</TldrawUiContextProvider>
		</main>
	)
}
