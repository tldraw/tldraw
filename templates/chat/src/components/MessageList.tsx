import { type UIMessage } from '@ai-sdk/react'
import { TLEditorSnapshot } from 'tldraw'
import { ChatMessage } from './ChatMessage'

interface MessageListProps {
	messages: UIMessage[]
	onImageClick: (snapshot: TLEditorSnapshot) => void
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
