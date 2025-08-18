import { FormEvent, useEffect, useRef, useState } from 'react'
import { DefaultSpinner } from 'tldraw'

interface ChatInputProps {
	onSendMessage: (message: string) => void
	disabled?: boolean
	autoFocus?: boolean
}

export function ChatInput({ onSendMessage, disabled = false, autoFocus = false }: ChatInputProps) {
	const [input, setInput] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (!disabled && inputRef.current) {
			inputRef.current.focus()
		}
	}, [disabled])

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		if (input.trim() && !disabled) {
			onSendMessage(input)
			setInput('')
		}
	}

	return (
		<form onSubmit={handleSubmit} className="chat-input-form">
			<div className="input-container">
				<input
					ref={inputRef}
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder={disabled ? '' : 'Type your message...'}
					className="chat-input"
					disabled={disabled}
					autoFocus={autoFocus}
				/>
				{disabled && (
					<div className="input-spinner">
						<DefaultSpinner />
					</div>
				)}
			</div>
			<button type="submit" disabled={disabled || !input.trim()} className="send-button">
				Send
			</button>
		</form>
	)
}
