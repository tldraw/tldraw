'use client'
import { TldrawUiTooltipProvider } from 'tldraw'
import { Chat } from '../components/Chat'

export default function Home() {
	return (
		<main className="tl-container tl-theme__light">
			<TldrawUiTooltipProvider>
				<Chat />
			</TldrawUiTooltipProvider>
		</main>
	)
}
