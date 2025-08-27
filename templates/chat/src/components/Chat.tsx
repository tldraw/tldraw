'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, FileUIPart, TextUIPart } from 'ai'
import { useCallback, useEffect } from 'react'
import { TLEditorSnapshot } from 'tldraw'
import { useChatInputState } from '../hooks/useChatInputState'
import { useScrollToBottom } from '../hooks/useScrollToBottom'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'
import { WhiteboardImage, WhiteboardModal, WhiteboardModalResult } from './WhiteboardModal'

export function Chat() {
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
			chatInputDispatch({ type: 'clear' })
		},
		[sendMessage, chatInputDispatch]
	)

	const scrollToBottom = useScrollToBottom()

	useEffect(() => {
		scrollToBottom()
	}, [messages, scrollToBottom])

	const handleImageClick = useCallback(
		(snapshot: TLEditorSnapshot) => {
			chatInputDispatch({ type: 'openWhiteboard', snapshot })
		},
		[chatInputDispatch]
	)

	const handleCloseWhiteboard = useCallback(
		(result: WhiteboardModalResult) => {
			chatInputDispatch({ type: 'closeWhiteboard' })
			if (result.type === 'accept') {
				// Add the modified image back to the chat input
				chatInputDispatch({ type: 'setImage', image: result.image })
			}
		},
		[chatInputDispatch]
	)

	const hasMessages = messages.length > 0
	const { openWhiteboard, isDragging } = chatInputState

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			if (e.dataTransfer.types.includes('Files') && !openWhiteboard && !isDragging) {
				chatInputDispatch({ type: 'dragEnter' })
			}
		},
		[openWhiteboard, isDragging, chatInputDispatch]
	)

	const handleDragLeave = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			if (!e.currentTarget.contains(e.relatedTarget as Node)) {
				chatInputDispatch({ type: 'dragLeave' })
			}
		},
		[chatInputDispatch]
	)

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			const file = e.dataTransfer.files[0]
			if (file && file.type.startsWith('image/') && !openWhiteboard) {
				chatInputDispatch({ type: 'drop', file })
			} else {
				chatInputDispatch({ type: 'dragLeave' })
			}
		},
		[chatInputDispatch, openWhiteboard]
	)

	if (!hasMessages) {
		return (
			<div
				className="empty-chat-container"
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<div className="empty-chat-content">
					<h1 className="empty-chat-title">How can I help?</h1>
					<div className="centered-input">
						<ChatInput
							onSendMessage={handleSendMessage}
							waitingForResponse={status !== 'ready'}
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
		<div
			className="chat-container"
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<MessageList messages={messages} onImageClick={handleImageClick} />
			<div className="chat-footer">
				<ChatInput
					onSendMessage={handleSendMessage}
					waitingForResponse={status !== 'ready'}
					scrollToBottom={scrollToBottom}
					state={chatInputState}
					dispatch={chatInputDispatch}
				/>
			</div>
			{openWhiteboard && (
				<WhiteboardModal
					imageId={openWhiteboard.id}
					initialSnapshot={openWhiteboard.snapshot}
					uploadedFile={openWhiteboard.uploadedFile}
					onClose={handleCloseWhiteboard}
				/>
			)}
		</div>
	)
}
