import { type UIMessage } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'

interface ChatMessageProps {
	message: UIMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
	// Check if message has any text content
	const hasTextContent = message.parts.some((part) => part.type === 'text' && part.text.trim())

	// For AI messages with no content, show thinking state
	if (message.role === 'assistant' && !hasTextContent) {
		return (
			<div className="message assistant-message thinking-message">
				<div className="thinking-text">Thinking…</div>
			</div>
		)
	}

	return (
		<div className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
			<div className="message-content">
				{message.parts.map((part, index) => {
					if (part.type === 'text') {
						return <ReactMarkdown key={index}>{part.text}</ReactMarkdown>
					}
					return null
				})}
			</div>
		</div>
	)
}
