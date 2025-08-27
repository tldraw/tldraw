import { type UIMessage } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'
import { TldrawProviderMetadata } from './WhiteboardModal'

interface ChatMessageProps {
	message: UIMessage
	onImageClick: (tldrawMetadata: TldrawProviderMetadata) => void
}

export function ChatMessage({ message, onImageClick }: ChatMessageProps) {
	// Split the message parts into image and text ones
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

	return (
		<div
			className={`message-group ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
		>
			{/* Render images first as separate message bubbles */}
			{imageParts.map((part, index) => {
				// we stash a snapshot of the tldraw document in the provider metadata:
				const tldrawMetadata = part.providerMetadata?.tldraw as TldrawProviderMetadata | undefined
				const handleImageClick = () => {
					// if we have a tldraw snapshot, we open the tldraw modal when it's clicked:
					if (tldrawMetadata) {
						onImageClick(tldrawMetadata)
					}
				}

				return (
					<button
						key={index}
						className="message message-image message-image-clickable"
						onClick={handleImageClick}
						type="button"
					>
						<img src={part.url} alt="Whiteboard" className="message-image-content" />
					</button>
				)
			})}

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
