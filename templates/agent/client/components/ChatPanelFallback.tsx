export function ChatPanelFallback() {
	return (
		<div className="chat-fallback">
			<p>Error loading chat history</p>
			<button
				onClick={() => {
					localStorage.clear()
					window.location.reload()
				}}
			>
				Clear chat history
			</button>
		</div>
	)
}
