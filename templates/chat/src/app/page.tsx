'use client'
import { TldrawUiTooltipProvider } from 'tldraw'
import { Chat } from '../components/Chat'

export default function Home() {
	return (
		<main className="tl-theme__light">
			{/* We use tooltips from tldraw's ui kit */}
			<TldrawUiTooltipProvider>
				<Chat />
			</TldrawUiTooltipProvider>
		</main>
	)
}
