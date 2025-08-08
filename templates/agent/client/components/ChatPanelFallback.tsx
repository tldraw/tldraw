export function ChatPanelFallback() {
	return (
		<div className="chat-panel-fallback">
			<p>Error loading chat history</p>
			<button
				className="chat-panel-fallback-button"
				onClick={() => {
					localStorage.removeItem('chat-history-items')
					localStorage.removeItem('context-items')
					localStorage.removeItem('model-name')
					window.location.reload()
				}}
			>
				Clear chat history
			</button>
		</div>
	)
}
