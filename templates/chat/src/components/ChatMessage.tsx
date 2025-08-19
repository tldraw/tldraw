import { type UIMessage } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'

interface ChatMessageProps {
	message: UIMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
	// Split the message parts into separate messages like iMessage
	const textParts = message.parts.filter((part) => part.type === 'text' && part.text.trim())
	const imageParts = message.parts.filter((part) => part.type === 'file')

	// For AI messages with no content, show thinking state
	if (message.role === 'assistant' && textParts.length === 0 && imageParts.length === 0) {
		return (
			<div className="message assistant-message thinking-message">
				<div className="thinking-text">Thinking…</div>
			</div>
		)
	}

	const groupClass = `message-group ${message.role === 'user' ? 'user-message' : 'assistant-message'}`

	return (
		<div className={groupClass}>
			{/* Render images first as separate message bubbles */}
			{imageParts.map((part, index) => (
				<img key={index} className="message message-image" src={part.url} alt="Whiteboard" />
			))}

			{/* Render text content in its own bubble */}
			{textParts.length > 0 && (
				<div className="message message-text">
					{textParts.map((part, index) => (
						<ReactMarkdown key={index}>{part.type === 'text' ? part.text : ''}</ReactMarkdown>
					))}
				</div>
			)}
		</div>
	)
}
