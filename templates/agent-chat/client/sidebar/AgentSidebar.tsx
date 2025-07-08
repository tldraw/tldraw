import React, { useEffect, useRef, useState } from 'react'
import './AgentSidebar.css'

interface Message {
	id: string
	text: string
	isUser: boolean
	timestamp: Date
}

interface AgentSidebarProps {
	className?: string
}

export function AgentSidebar({ className = '' }: AgentSidebarProps) {
	const [messages, setMessages] = useState<Message[]>([])
	const [inputValue, setInputValue] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [sidebarWidth, setSidebarWidth] = useState(400)
	const inputRef = useRef<HTMLInputElement>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const sidebarRef = useRef<HTMLDivElement>(null)

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	useEffect(() => {
		scrollToBottom()
	}, [messages])

	const handleSidebarClick = (e: React.MouseEvent) => {
		// Only focus if clicking on the sidebar background, not on messages or input
		if (e.target === e.currentTarget) {
			inputRef.current?.focus()
		}
	}

	const handleSendMessage = async () => {
		if (!inputValue.trim() || isLoading) return

		const userMessage: Message = {
			id: Date.now().toString(),
			text: inputValue.trim(),
			isUser: true,
			timestamp: new Date(),
		}

		setMessages((prev) => [...prev, userMessage])
		setInputValue('')
		setIsLoading(true)

		// Simulate agent response (replace with actual API call)
		setTimeout(() => {
			const agentMessage: Message = {
				id: (Date.now() + 1).toString(),
				text: `I received your message: "${userMessage.text}". This is a placeholder response.`,
				isUser: false,
				timestamp: new Date(),
			}
			setMessages((prev) => [...prev, agentMessage])
			setIsLoading(false)
		}, 1000)
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSendMessage()
		}
	}

	const handleResizeStart = (e: React.MouseEvent) => {
		e.preventDefault()
		const startX = e.clientX
		const startWidth = sidebarWidth

		const handleMouseMove = (e: MouseEvent) => {
			const deltaX = startX - e.clientX
			const newWidth = Math.max(300, Math.min(600, startWidth + deltaX))
			setSidebarWidth(newWidth)
		}

		const handleMouseUp = () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
		}

		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)
	}

	return (
		<div
			ref={sidebarRef}
			className={`agent-sidebar ${className}`}
			onClick={handleSidebarClick}
			style={{ width: `${sidebarWidth}px` }}
		>
			<div className="resize-handle" onMouseDown={handleResizeStart} />
			<div className="messages-container">
				{messages.length === 0 ? (
					<div className="empty-state">
						<div className="empty-icon">🤖</div>
						<p>*beep* *boop* hello i am bot</p>
					</div>
				) : (
					<div className="messages-list">
						{messages.map((message) => (
							<div
								key={message.id}
								className={`message ${message.isUser ? 'user-message' : 'agent-message'}`}
							>
								<div className="message-bubble">
									<p>{message.text}</p>
									<span className="message-time">
										{message.timestamp.toLocaleTimeString([], {
											hour: '2-digit',
											minute: '2-digit',
										})}
									</span>
								</div>
							</div>
						))}
						{isLoading && (
							<div className="message agent-message">
								<div className="message-bubble loading">
									<div className="typing-indicator">
										<span></span>
										<span></span>
										<span></span>
									</div>
								</div>
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			<div className="chat-input-container">
				<div className="chat-input-wrapper">
					<input
						ref={inputRef}
						type="text"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Make something"
						className="chat-input"
						disabled={isLoading}
					/>
					<button
						onClick={handleSendMessage}
						disabled={!inputValue.trim() || isLoading}
						className="send-button"
					>
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<line x1="12" y1="19" x2="12" y2="5"></line>
							<polyline points="5,12 12,5 19,12"></polyline>
						</svg>
					</button>
				</div>
			</div>
		</div>
	)
}
