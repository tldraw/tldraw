'use client'

import { useCallback, useEffect, useState } from 'react'
import { uniqueId } from 'tldraw'
import { useChatMessageStorage } from '@/hooks/useChatMessageStorage'
import { ChatMessage, ChatPart } from '@/types'
import { useChatInputState } from '../hooks/useChatInputState'
import { useScrollToBottom } from '../hooks/useScrollToBottom'
import { ChatInput } from './ChatInput'
import { ImageClickTarget } from './ChatMessage'
import { ClearChatIcon } from './ClearChatIcon'
import { MessageList } from './MessageList'
import { WhiteboardImage } from './WhiteboardModal'

export function Chat() {
	// store chat messages locally in the browser
	const [initialMessages, saveMessages] = useChatMessageStorage()

	if (!initialMessages) return null

	return <ChatInner initialMessages={initialMessages} saveMessages={saveMessages} />
}

function ChatInner({
	initialMessages,
	saveMessages,
}: {
	initialMessages: ChatMessage[]
	saveMessages: (messages: ChatMessage[]) => void
}) {
	// All state relating to the chat input and the tldraw modal is managed in this hook
	const [chatInputState, chatInputDispatch] = useChatInputState()

	const [messages, setMessages] = useState(initialMessages)
	const [waitingForResponse, setWaitingForResponse] = useState(false)

	// when the user send a message, we take the text they've written and any images / sketches
	// they've attached and send them to the model. The reply streams in as plain text.
	const handleSendMessage = useCallback(
		async (text: string, images: WhiteboardImage[]) => {
			chatInputDispatch({ type: 'clear' })

			const parts: ChatPart[] = images.map((image) => ({
				type: 'file',
				url: image.url,
				filename: image.name,
				mediaType: image.type,
				providerMetadata: { tldraw: { snapshot: image.snapshot, imageName: image.name } },
			}))
			if (text.trim()) {
				parts.push({ type: 'text', text })
			}

			const history = [...messages, { id: uniqueId(), role: 'user' as const, parts }]
			const replyId = uniqueId()
			let latest: ChatMessage[] = [...history, { id: replyId, role: 'assistant', parts: [] }]
			setMessages(latest)
			setWaitingForResponse(true)
			try {
				const response = await fetch('/api/chat', { method: 'POST', body: JSON.stringify(history) })
				if (!response.ok || !response.body) throw new Error(await response.text())
				const reader = response.body.getReader()
				const decoder = new TextDecoder()
				let reply = ''
				while (true) {
					const { value, done } = await reader.read()
					if (done) break
					reply += decoder.decode(value, { stream: true })
					latest = [
						...history,
						{ id: replyId, role: 'assistant', parts: [{ type: 'text', text: reply }] },
					]
					setMessages(latest)
				}
			} catch (error) {
				// The user's message stays, so they can see what failed and send it again.
				alert(error instanceof Error ? error.message : String(error))
				latest = history
				setMessages(latest)
			} finally {
				setWaitingForResponse(false)
				saveMessages(latest)
			}
		},
		[messages, saveMessages, chatInputDispatch]
	)

	// keep the chat scrolled to the bottom as messages are added or changed
	const scrollToBottom = useScrollToBottom()
	useEffect(() => {
		scrollToBottom()
	}, [messages, scrollToBottom])

	// when the user clicks on an image from chat history, we open the tldraw modal. here they can
	// see a larger version of the image, but also annotate it and re-add it to the chat.
	const handleImageClick = useCallback(
		(opts: ImageClickTarget) => chatInputDispatch({ type: 'openWhiteboard', ...opts }),
		[chatInputDispatch]
	)

	const handleClearChat = useCallback(() => {
		setMessages([])
		saveMessages([])
	}, [saveMessages])

	// users can drag and drop images to the chat input area to add them to their message. when
	// they're dragging we keep track of a special isDragging state.
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		if (
			e.dataTransfer.types.includes('Files') &&
			!chatInputState.openWhiteboard &&
			!chatInputState.isDragging
		) {
			chatInputDispatch({ type: 'dragEnter' })
		}
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			chatInputDispatch({ type: 'dragLeave' })
		}
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		const file = e.dataTransfer.files[0]
		if (file && file.type.startsWith('image/') && !chatInputState.openWhiteboard) {
			chatInputDispatch({ type: 'drop', file })
		} else {
			chatInputDispatch({ type: 'dragLeave' })
		}
	}

	// if the chat is empty, we put the input area right in the middle of the page
	if (messages.length === 0) {
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
							waitingForResponse={waitingForResponse}
							scrollToBottom={scrollToBottom}
							state={chatInputState}
							dispatch={chatInputDispatch}
						/>
					</div>
				</div>
			</div>
		)
	}

	// otherwise, we show the chat history and the input area at the bottom.
	return (
		<div
			className="chat-container"
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<div className="chat-header">
				<button className="icon-button" onClick={handleClearChat} title="Clear chat">
					<ClearChatIcon />
				</button>
			</div>
			<MessageList messages={messages} onImageClick={handleImageClick} />
			<div className="chat-footer">
				<ChatInput
					onSendMessage={handleSendMessage}
					waitingForResponse={waitingForResponse}
					scrollToBottom={scrollToBottom}
					state={chatInputState}
					dispatch={chatInputDispatch}
				/>
			</div>
		</div>
	)
}
