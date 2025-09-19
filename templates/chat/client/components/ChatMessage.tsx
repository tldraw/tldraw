import { type UIMessage } from '@ai-sdk/react'
import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { FileHelpers, TLEditorSnapshot } from 'tldraw'
import { TldrawProviderMetadata } from './WhiteboardModal'

interface ChatMessageProps {
	message: UIMessage
	onImageClick: (
		opts: { snapshot: TLEditorSnapshot; imageName: string } | { uploadedFile: File }
	) => void
}

export const ChatMessage = memo(function ChatMessage({ message, onImageClick }: ChatMessageProps) {
	// For AI messages with no content, show thinking state
	if (
		message.role === 'assistant' &&
		!message.parts.some((part) => part.type === 'file' || part.type === 'text')
	) {
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
			{message.parts.map((part, index) => {
				if (part.type === 'file') {
					// we stash a snapshot of the tldraw document in the provider metadata:
					const tldrawMetadata = part.providerMetadata?.tldraw as TldrawProviderMetadata | undefined
					const handleImageClick = async () => {
						// if we have a tldraw snapshot, we open the tldraw modal when it's clicked:
						if (tldrawMetadata) {
							onImageClick(tldrawMetadata)
						} else {
							const blob = await FileHelpers.urlToBlob(part.url)
							const file = new File([blob], part.filename || 'image.png', { type: blob.type })
							onImageClick({ uploadedFile: file })
						}
					}

					return (
						<button
							key={index}
							aria-label="Open image"
							className="message message-image message-image-clickable"
							onClick={handleImageClick}
							type="button"
						>
							<img src={part.url} alt="Whiteboard" className="message-image-content" />
						</button>
					)
				}

				if (part.type === 'text') {
					return (
						<div key={index} className="message message-text">
							<ReactMarkdown>{part.text}</ReactMarkdown>
						</div>
					)
				}

				return null
			})}
		</div>
	)
})
