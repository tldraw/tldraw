'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, FileUIPart, TextUIPart } from 'ai'
import { useCallback, useEffect, useState } from 'react'
import { TLEditorSnapshot } from 'tldraw'
import { useChatInputState } from '../hooks/useChatInputState'
import { useScrollToBottom } from '../hooks/useScrollToBottom'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'
import { WhiteboardImage, WhiteboardModal, WhiteboardModalResult } from './WhiteboardModal'

export function Chat() {
	const [chatImageModal, setChatImageModal] = useState<{ snapshot: TLEditorSnapshot } | null>(null)
	const [chatInputState, chatInputDispatch] = useChatInputState()

	const { messages, sendMessage, status } = useChat({
		transport: new DefaultChatTransport({
			api: '/api/chat',
		}),
	})

	const handleSendMessage = useCallback(
		(text: string, images: WhiteboardImage[]) => {
			const parts: (TextUIPart | FileUIPart)[] = images.map(
				(image): FileUIPart => ({
					type: 'file',
					url: image.url,
					mediaType: image.type,
					providerMetadata: { tldrawSnapshot: image.snapshot as any },
				})
			)
			if (text.trim()) {
				parts.push({ type: 'text', text })
			}

			sendMessage({
				parts,
			})

			// Clear chat input after sending
			chatInputDispatch({ type: 'CLEAR' })
		},
		[sendMessage, chatInputDispatch]
	)

	const scrollToBottom = useScrollToBottom()

	useEffect(() => {
		scrollToBottom()
	}, [messages, scrollToBottom])

	const handleImageClick = useCallback((snapshot: TLEditorSnapshot) => {
		setChatImageModal({ snapshot })
	}, [])

	const handleCloseChatImageModal = useCallback(
		(result: WhiteboardModalResult) => {
			setChatImageModal(null)
			if (result.type === 'accept') {
				// Add the modified image back to the chat input
				chatInputDispatch({ type: 'SET_IMAGE', payload: result.image })
			}
		},
		[chatInputDispatch]
	)

	const hasMessages = messages.length > 0

	if (!hasMessages) {
		return (
			<div className="empty-chat-container">
				<div className="empty-chat-content">
					<h1 className="empty-chat-title">How can I help?</h1>
					<div className="centered-input">
						<ChatInput
							onSendMessage={handleSendMessage}
							disabled={status !== 'ready'}
							autoFocus={true}
							scrollToBottom={scrollToBottom}
							state={chatInputState}
							dispatch={chatInputDispatch}
						/>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="chat-container">
			<MessageList messages={messages} onImageClick={handleImageClick} />
			<div className="chat-footer">
				<ChatInput
					onSendMessage={handleSendMessage}
					disabled={status !== 'ready'}
					autoFocus={true}
					scrollToBottom={scrollToBottom}
					state={chatInputState}
					dispatch={chatInputDispatch}
				/>
			</div>
			{chatImageModal && (
				<WhiteboardModal
					initialSnapshot={chatImageModal.snapshot}
					onClose={handleCloseChatImageModal}
				/>
			)}
		</div>
	)
}
