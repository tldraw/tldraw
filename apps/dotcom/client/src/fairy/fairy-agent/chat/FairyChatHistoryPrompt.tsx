import { ChatHistoryPromptItem } from '@tldraw/fairy-shared'

export function FairyChatHistoryPrompt({ item }: { item: ChatHistoryPromptItem }) {
	const { message } = item

	return (
		<div className="fairy-chat-history-prompt-container fairy-chat-history-prompt-sticky">
			<div className="fairy-chat-history-prompt">
				<div className="fairy-chat-history-prompt-content">{message}</div>
			</div>
		</div>
	)
}
