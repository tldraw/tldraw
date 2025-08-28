import { type UIMessage } from '@ai-sdk/react'
import { ChatMessage } from './ChatMessage'
import { TldrawProviderMetadata } from './WhiteboardModal'

interface MessageListProps {
	messages: UIMessage[]
	onImageClick: (tldrawMetadata: TldrawProviderMetadata) => void
}

export function MessageList({ messages, onImageClick }: MessageListProps) {
	return (
		<div className="message-list">
			{messages.map((message) => (
				<ChatMessage key={message.id} message={message} onImageClick={onImageClick} />
			))}
		</div>
	)
}
