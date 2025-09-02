import { type UIMessage } from '@ai-sdk/react'
import { memo } from 'react'
import { ChatMessage } from './ChatMessage'
import { TldrawProviderMetadata } from './WhiteboardModal'

interface MessageListProps {
	messages: UIMessage[]
	onImageClick: (tldrawMetadata: TldrawProviderMetadata | { uploadedFile: File }) => void
}

export const MessageList = memo(function MessageList({ messages, onImageClick }: MessageListProps) {
	return (
		<div className="message-list">
			{messages.map((message) => (
				<ChatMessage key={message.id} message={message} onImageClick={onImageClick} />
			))}
		</div>
	)
})
